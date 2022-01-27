import * as express from "express";
import { Request, Response } from "express";
import { Template, constants } from "@walletpass/pass-js";
import Icon from "./images/icon.png";
import PemCertificate from "./certificates/cert.pem";
import { v4 as uuidv4 } from "uuid";
import { ErrorTypes, SiweMessage, generateNonce } from "siwe";
import { providers } from "ethers";
import * as session from "express-session";
const Redis = require("ioredis");

let RedisStore = require("connect-redis")(session);

const client = new Redis(
  "redis://:p01ae314dbeaf1e9d9f38982b28e86568ceb1d18c86c6255b8757545797369588@ec2-54-159-238-171.compute-1.amazonaws.com:19670",
  {
    tls: {
      rejectUnauthorized: false,
    },
  }
);

const app = express();

const helmet = require("helmet");
const Path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "passes",
    secret: "siwe-fnftpass",
    resave: true,
    saveUninitialized: true,
    store: new RedisStore({
      client,
    }),
    cookie: {
      maxAge: 60000,
      httpOnly: true,
      secure: false,
    },
  })
);

const { PORT = 4000 } = process.env;

const passTypeIdentifier = "pass.EthGlobalNFTPass";

const PROD = process.env.ENVIRONMENT === "production";
// const STAGING = process.env.ENVIRONMENT === 'staging';
const STAGING = true;

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

var whitelist = [
  "http://localhost:3000",
  "https://frontend-nftpass.vercel.app/",
  "https://frontend-nftpass.vercel.app",
];
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true, //Credentials are cookies, authorization headers or TLS client certificates.
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "device-remember-token",
    "Access-Control-Allow-Origin",
    "Origin",
    "Accept",
  ],
};

app.use(cors(corsOptions));

app.get("/api/nonce", async (req, res) => {
  req.session.nonce = generateNonce();
  req.session.save(() => res.status(200).send(req.session.nonce).end());
});

app.get("/api/me", async (req, res) => {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to first sign_in" });
    return;
  }
  res
    .status(200)
    .json({
      text: req.session.siwe.address,
      address: req.session.siwe.address,
      ens: req.session.ens,
    })
    .end();
});

app.post("/api/sign_in", async (req, res) => {
  try {
    console.log(req.session);
    const { ens } = req.body;
    if (!req.body.message) {
      res.status(422).json({ message: "Expected signMessage object as body." });
      return;
    }

    const message = new SiweMessage(req.body.message);

    const infuraProvider = new providers.JsonRpcProvider(
      {
        allowGzip: true,
        url: `${getInfuraUrl(
          message.chainId
        )}/7198664fb9b24a2caf1ff8a52c4eb01e`,
        headers: {
          Accept: "*/*",
          Origin: `http://localhost:${PORT}`,
          "Accept-Encoding": "gzip, deflate, br",
          "Content-Type": "application/json",
        },
      },
      Number.parseInt(message.chainId)
    );

    await infuraProvider.ready;

    const fields: SiweMessage = await message.validate(infuraProvider);
    console.log(fields);

    if (fields.nonce !== req.body.message.nonce) {
      console.log(req.session);
      console.log(fields.nonce);
      console.log(req.session.nonce);
      res.status(422).json({ message: `Invalid nonce.` });
      return;
    }

    req.session.siwe = fields;
    req.session.ens = ens;
    req.session.nonce = null;
    req.session.cookie.expires = new Date(fields.expirationTime);
    const pass = template.createPass({
      serialNumber: uuidv4(),
      description: "NFT Pass",
    });
    pass.primaryFields.add({ key: "name", label: "Name", value: ens });
    pass.foregroundColor = "blue";
    // ctx.response.type = constants.PASS_MIME_TYPE;

    res.contentType(constants.PASS_MIME_TYPE);

    req.session.save(async () => {
      {
        res.contentType(constants.PASS_MIME_TYPE);
        res.send(await pass.asBuffer());
      }
    });
  } catch (e) {
    req.session.siwe = null;
    req.session.nonce = null;
    req.session.ens = null;
    console.error(e);
    switch (e) {
      case ErrorTypes.EXPIRED_MESSAGE: {
        req.session.save(() => res.status(440).json({ message: e.message }));
        break;
      }
      case ErrorTypes.INVALID_SIGNATURE: {
        req.session.save(() => res.status(422).json({ message: e.message }));
        break;
      }
      default: {
        req.session.save(() => res.status(500).json({ message: e.message }));
        break;
      }
    }
  }
});

app.post("/api/sign_out", async (req, res) => {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to sign_in first" });
    return;
  }

  req.session.destroy(() => {
    res.status(205).send();
  });
});

const template = new Template("coupon", {
  passTypeIdentifier,
  teamIdentifier: "SYWL7HXFU9",
  backgroundColor: "white",
  sharingProhibited: true,
  organizationName: "Not me",
});
template.webServiceURL = "https://nftpasseth.herokuapp.com";
template.authenticationToken = "ABCDABCDABCDABCDABCDABCDABCD";

const addImages = async () => {
  await template.images.add("icon", __dirname + "/" + Icon);
  await template.images.add("logo", __dirname + "/" + Icon);
  await template.loadCertificate(__dirname + "/" + PemCertificate, "Belal");
};
addImages();

// app.get('/passUpdate/v1/passes/*', function(req, res){
//   console.log('Getting the Latest Version of a Pass');
//   var path  = req.path;
//   var parts = path.split("/");
//   var deviceLibraryIdentifier = parts[4];
//   var passTypeIdentifier = parts[5];
//   var authorization = req.headers.authorization;
//   var file = __dirname + '/public/pass/mytest.pkpass';
//   res.setHeader('Content-type', 'application/vnd.apple.pkpass');
//   res.setHeader('Last-Modified', 'Mon, 03 Apr 2016 19:01:35 GMT');
//   res.sendFile(file);
// });

app.all("*", (req, res, next) => {
  console.log(req.path); // do anything you want here
  next();
});

// app.get(
//   "v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier",
//   (req, res) => {
//     // console.log("Getting a Pass");
//     // const deviceLibraryIdentifier = req.params.deviceLibraryIdentifier;
//     // const passTypeIdentifier = req.params.passTypeIdentifier;
//     // const pass = template.toPass(uuidv4());
//     // res.setHeader("Content-Type", "application/vnd.apple.pkpass");
//     // res.send(pass.toBuffer());
//   }
// );

app.post("/v1/devices", (req, res) => {
  res.send("hello");
});

app.post("/", (req, res) => {
  console.log("post coming");
  console.log(req);

  res.send("hello");
});

// app.delete(
//   "v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier",
//   (req, res) => {}
// );

// app.post("/v1/log", (req, res) => {
//   console.log("Logging");
//   console.log(req);
//   res.send("Logging");
// });

app.get("/update", async (req, res) => {
  const head = await template.pushUpdates("12345");
  console.log(head);
});

app.get("/api/getwallet", async (req, res) => {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to sign_in first" });
    return;
  }

  const address = req.session.siwe.address;
  res.status(204).send().end();
});

app.get("/", async (req: Request, res: Response) => {
  const pass = template.createPass({
    serialNumber: uuidv4(),
    description: "DEMOOOO",
  });
  pass.primaryFields.add({ key: "Name", label: "Time", value: "12:00AM" });
  pass.foregroundColor = "blue";
  // ctx.response.type = constants.PASS_MIME_TYPE;

  res.contentType(constants.PASS_MIME_TYPE);
  res.send(await pass.asBuffer());
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("server started at http://localhost:" + PORT);
  });
}
export default app;

const getInfuraUrl = (chainId: string) => {
  switch (Number.parseInt(chainId)) {
    case 1:
      return "https://mainnet.infura.io/v3";
    case 3:
      return "https://ropsten.infura.io/v3";
    case 4:
      return "https://rinkeby.infura.io/v3";
    case 5:
      return "https://goerli.infura.io/v3";
    case 137:
      return "https://polygon-mainnet.infura.io/v3";
  }
};

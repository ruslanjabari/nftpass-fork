import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import {
  AnnotationIcon,
  GlobeAltIcon,
  LightningBoltIcon,
  ScaleIcon,
} from "@heroicons/react/outline";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import Web3 from "web3";
import WalletConnectProvider from "@walletconnect/web3-provider";
import axios from "axios";
import { SignatureType, SiweMessage } from "siwe";
import { ethers } from "ethers";
import download from "js-file-download";
import { useRef } from "react";

const Home: NextPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [web3, setWeb3] = useState<boolean>(false);
  const [provider, setProivder] = useState<WalletConnectProvider | null>(null);
  const [signed, setSigned] = useState<boolean>(false);
  const [downloadLink, setDownloadLink] = useState<string>("");
  const atag = useRef<any>();

  useEffect(() => {
    const setupProvider = async () => {
      const provider = new WalletConnectProvider({
        infuraId: "7198664fb9b24a2caf1ff8a52c4eb01e",
      });
      setProivder(provider);
    };
    setupProvider();
    () => {
      if (provider) {
        provider.disconnect();
      }
      setProivder(null);
    };
  }, []);

  function closeModal() {
    setIsOpen(false);
  }

  async function me() {
    const nonce = await fetch("https://nftpasseth.herokuapp.com/api/me", {
      credentials: "include",
    }).then((res) => res.text());
    console.log(nonce);
  }

  async function openModal() {
    // setIsOpen(true);
    if (!web3 && provider) {
      try {
        await provider.enable();
        setWeb3(true);
      } catch (e) {
        console.log(e);
      }
    } else if (web3 && provider) {
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const [address] = await ethersProvider.listAccounts();
      console.log(address);
      if (!address) {
        throw new Error("Address not found.");
      }

      let ens: string = "";
      try {
        // @ts-ignore
        ens = await ethersProvider.lookupAddress(address);
      } catch (error) {
        console.error(error);
      }

      const nonce = await fetch("https://nftpasseth.herokuapp.com/api/nonce", {
        credentials: "include",
      }).then((res) => res.text());
      console.log(nonce);

      const message = new SiweMessage({
        domain: document.location.host,
        address,
        chainId: `${await ethersProvider
          .getNetwork()
          .then(({ chainId }) => chainId)}`,
        uri: document.location.origin,
        version: "1",
        statement: "SIWE Notepad Example",
        type: SignatureType.PERSONAL_SIGNATURE,
        nonce,
      });

      const signature = await ethersProvider
        .getSigner()
        .signMessage(message.signMessage());

      message.signature = signature;

      // const response = await axios.post(
      //   "https://nftpasseth.herokuapp.com/api/sign_in",
      //   { message, ens },
      //   {
      //     withCredentials: true,
      //   }
      // );

      // console.log(response.data, "response");

      fetch(`https://nftpasseth.herokuapp.com/api/sign_in`, {
        method: "POST",
        body: JSON.stringify({ message, ens }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }).then(async (res) => {
        if (res.status === 200) {
          var reader = new FileReader();
          let blob = await res.blob();
          reader.onload = function (e) {
            // @ts-ignore
            window.location.href = reader.result;
          };
          setTimeout(() => {
            reader.readAsDataURL(blob);
          }, 500);
          // blob = blob.slice(0, blob.size, "application/vnd.apple.pkpass");
          // const url = (window.URL ? URL : webkitURL).createObjectURL(blob);
          // atag.current.href = url;
          // atag.current.download = "pass.pkpass";

          // setTimeout(() => {
          //   // link.click();
          //   atag.current.click();
          // }, 1000);
          // setDownloadLink(url);

          // a.click();
          // document.body.removeChild(a);
          // download(res.data,)
          // res.json().then(({ text, address, ens }) => {
          //   // connectedState(text, address, ens);
          //   console.log(text, address, ens);
          //   return;
          // });
        } else {
          res.json().then((err) => {
            console.error(err);
          });
        }
      });

      // fetch("https://nftpasseth.herokuapp.com/api/sign_in", {
      //   method: "POST",
      //   body: JSON.stringify({ message, ens }),
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      // }).then(async (res) => {
      //   if (res.status === 200) {
      //     res.json().then(({ text, address, ens }) => {
      //       console.log(text, address, ens);
      //       return;
      //     });
      //   } else {
      //     res.json().then((err) => {
      //       console.error(err);
      //     });
      //   }
      // });
    }
  }

  //   <a
  //   className="text-5xl font-extrabold text-white underline"
  //   href={downloadLink}
  //   download="pass.pkpass"
  // >

  // </a>

  return (
    <div>
      <div className="bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 fixed inset-0 flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={openModal}
          className="font-sans drop-shadow px-8 py-6 text-sm font-medium text-4xl font-extrabold text-white bg-white rounded-lg bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
        >
          {web3 ? "Add to your wallet" : "Connect your wallet"}
        </button>
        {web3 && (
          <button
            type="button"
            onClick={() => {
              provider?.disconnect();
              setWeb3(false);
            }}
            className="absolute px-4 py-2 text-sm font-medium text-white bg-white rounded-md bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
            style={{ right: "16px", bottom: "16px" }}
          >
            {provider ? "Disconnect your wallet" : ""}
          </button>
        )}
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={closeModal}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                {/* 
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Payment successful
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Your payment has been successfully submitted. We’ve sent you
                    an email with all of the details of your order.
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={closeModal}
                  >
                    Got it, thanks!
                  </button>
                </div> */}
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Home;

import "../styles/globals.css";
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <meta name="theme-color" content="#eab308" />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;

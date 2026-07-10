import Head from 'next/head';
import dynamic from 'next/dynamic';

const NextClientApp = dynamic(() => import('../src/NextClientApp.jsx'), {
  ssr: false,
});

export default function AppPage() {
  return (
    <>
      <Head>
        <title>Krishna Printers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <NextClientApp />
    </>
  );
}

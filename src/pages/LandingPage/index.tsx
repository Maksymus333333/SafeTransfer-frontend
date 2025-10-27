import { JSX } from 'react/jsx-runtime';
import { Header } from '../../modules/Header';
import { FileManager } from '../../modules/FileManager';

export const LandingPage = (): JSX.Element => {
  return (
    <>
      <Header />
      <FileManager />
    </>
  );
};

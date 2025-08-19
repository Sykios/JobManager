import { useContext } from 'react';
import { FileServiceContext } from '../context/FileServiceContext';

export const useFileService = () => {
  return useContext(FileServiceContext);
};

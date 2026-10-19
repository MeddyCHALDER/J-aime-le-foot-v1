import { useMutation } from '@tanstack/react-query';
import * as mediaApi from './api';
import type { MediaKind } from './api';

export function useUploadMedia() {
  return useMutation({
    mutationFn: ({
      kind,
      file,
      contentType,
    }: {
      kind: MediaKind;
      file: Blob | ArrayBuffer;
      contentType: string;
    }) => mediaApi.uploadMedia(kind, file, contentType),
  });
}

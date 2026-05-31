interface ScrollLockDocument {
  documentElement: { style: { overflow: string } };
  body: { style: { overflow: string } };
}

export function lockDocumentScroll(documentLike: ScrollLockDocument): () => void {
  const previousHtmlOverflow = documentLike.documentElement.style.overflow;
  const previousBodyOverflow = documentLike.body.style.overflow;

  documentLike.documentElement.style.overflow = 'hidden';
  documentLike.body.style.overflow = 'hidden';

  return () => {
    documentLike.documentElement.style.overflow = previousHtmlOverflow;
    documentLike.body.style.overflow = previousBodyOverflow;
  };
}

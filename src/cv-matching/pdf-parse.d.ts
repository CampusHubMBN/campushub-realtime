declare module 'pdf-parse/lib/pdf-parse.js' {
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;
  export = pdfParse;
}

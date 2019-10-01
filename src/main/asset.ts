export interface Asset {
    name: string;
    contentType: string,
    contentLength: number,
    file: Buffer
}
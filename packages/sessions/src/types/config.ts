export type SessionsConfig = {
  cachePath?: string;
  maxAge?: number;
  tools?: string[];
};

export type GeneratedFile = {
  path: string;
  content: string;
  format: string;
};


export const HTTP_API_URL = 
    import.meta.env.DEV ?
    'http://localhost:9208' :
    '';

export const GECKOS_URL =
    import.meta.env.DEV ?
    'http://localhost' :
    '/';

export const GECKOS_PORT = 9208;

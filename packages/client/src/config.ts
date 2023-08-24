
export const HTTP_API_URL = 
    import.meta.env.DEV ?
    'http://localhost:9208/' :
    window.location.origin + window.location.pathname;

export const GECKOS_URL = HTTP_API_URL;

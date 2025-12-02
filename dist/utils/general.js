import dotenv from 'dotenv';
dotenv.config();
export function isDev() {
    if (process.env.NODE_ENV === 'production') {
        return false;
    }
    return true;
}
//# sourceMappingURL=general.js.map
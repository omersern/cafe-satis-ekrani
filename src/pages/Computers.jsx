import { Navigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';

/** Eski rota — Satış > Masalar sekmesine yönlendir */
export default function Computers() {
  return <Navigate to={ROUTES.sale} replace state={{ view: 'masalar' }} />;
}

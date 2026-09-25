import { useAuth } from '../context/AuthContext';
import PinLogin from './metro/PinLogin';

export default function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <PinLogin />;
  return children;
}

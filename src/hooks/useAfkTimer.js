import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { clearAuthSession, redirectToLogin } from '../lib/sessionAuth';
import {
  DEFAULT_AFK_TIMEOUT_SECONDS,
  loadSoundSettings,
  subscribeSoundSettings,
} from '../lib/soundSettings';

function formatAfk(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function useAfkTimer() {
  const navigate = useNavigate();
  const [limitSeconds, setLimitSeconds] = useState(DEFAULT_AFK_TIMEOUT_SECONDS);
  const [afkSecondsLeft, setAfkSecondsLeft] = useState(DEFAULT_AFK_TIMEOUT_SECONDS);
  const limitRef = useRef(limitSeconds);

  useEffect(() => {
    limitRef.current = limitSeconds;
  }, [limitSeconds]);

  useEffect(() => {
    let active = true;
    loadSoundSettings().then((settings) => {
      if (!active) return;
      setLimitSeconds(settings.afkTimeoutSeconds);
      setAfkSecondsLeft(settings.afkTimeoutSeconds);
    });
    return subscribeSoundSettings(() => {
      loadSoundSettings().then((settings) => {
        if (!active) return;
        setLimitSeconds(settings.afkTimeoutSeconds);
        setAfkSecondsLeft(settings.afkTimeoutSeconds);
      });
    });
  }, []);

  useEffect(() => {
    let intervalId;
    let timeoutId;

    const resetTimers = () => {
      const limit = limitRef.current;
      setAfkSecondsLeft(limit);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void clearAuthSession().finally(() => {
          // Sale'i sök (arka plan sorguları dursun), sonra oturumu düşür →
          // RequireAuth PIN ekranını yerinde gösterir.
          navigate(ROUTES.metro, { replace: true });
          redirectToLogin();
        });
      }, limit * 1000);

      clearInterval(intervalId);
      intervalId = setInterval(() => {
        setAfkSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    };

    const onActivity = () => resetTimers();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click', 'scroll', 'wheel'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

    resetTimers();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [navigate, limitSeconds]);

  return { afkSecondsLeft, afkLabel: formatAfk(afkSecondsLeft) };
}

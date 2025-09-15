import React, { useEffect, useState } from "react";

export default function Countdown({ targetTime, prefix = "", suffix = "" }) {
  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(targetTime - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  if (timeLeft <= 0) return null;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <span>
      {prefix}{days > 0 && `${days}d `}{hours > 0 && `${hours}h `}{minutes}m {seconds}s{suffix}
    </span>
  );
};

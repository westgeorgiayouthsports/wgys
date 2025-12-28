import React, { useEffect } from 'react';
import { message } from 'antd';
import logger from '../utils/logger';

const NotificationProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [msgApi, contextHolder] = message.useMessage();

  useEffect(() => {
    // Preserve originals so we can restore on unmount
    const originals: any = {
      success: (message as any).success,
      error: (message as any).error,
      info: (message as any).info,
      warning: (message as any).warning,
      open: (message as any).open,
    };

    try {
      (message as any).success = (...args: any[]) => (msgApi as any).success.apply(msgApi, args as any);
      (message as any).error = (...args: any[]) => (msgApi as any).error.apply(msgApi, args as any);
      (message as any).info = (...args: any[]) => (msgApi as any).info.apply(msgApi, args as any);
      (message as any).warning = (...args: any[]) => (msgApi as any).warning.apply(msgApi, args as any);
      (message as any).open = (...args: any[]) => (msgApi as any).open.apply(msgApi, args as any);
    } catch (e) {
      // ignore; best-effort override
      console.error('Failed to override message methods', e);
    }

    return () => {
      try {
        (message as any).success = originals.success;
        (message as any).error = originals.error;
        (message as any).info = originals.info;
        (message as any).warning = originals.warning;
        (message as any).open = originals.open;
      } catch (e) {
        logger.error('Failed to notify via Antd message methods', e);
      }
    };
  }, [msgApi]);

  return (
    <>
      {contextHolder}
      {children}
    </>
  );
};

export default NotificationProvider;

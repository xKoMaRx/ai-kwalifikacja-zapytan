window.mockApi = {
  analyzeInquiry(payload) {
    return new Promise((resolve) => {
      const delay = 520 + Math.floor(Math.random() * 700);
      window.setTimeout(() => {
        resolve({
          ...payload,
          requestId: `REQ-${Math.floor(100000 + Math.random() * 900000)}`,
          source: payload.source,
        });
      }, delay);
    });
  },
};

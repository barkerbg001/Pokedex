const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((webVitals) => {
      // Handle potential changes in web-vitals exports
      const { getCLS, getFID, getFCP, getLCP, getTTFB, onCLS, onFCP, onLCP, onTTFB, onINP } = webVitals;
      
      // Use the available functions, with fallbacks for newer versions
      if (getCLS) getCLS(onPerfEntry);
      else if (onCLS) onCLS(onPerfEntry);
      
      if (getFID) getFID(onPerfEntry);
      else if (onINP) onINP(onPerfEntry); // getFID was replaced with onINP in newer versions
      
      if (getFCP) getFCP(onPerfEntry);
      else if (onFCP) onFCP(onPerfEntry);
      
      if (getLCP) getLCP(onPerfEntry);
      else if (onLCP) onLCP(onPerfEntry);
      
      if (getTTFB) getTTFB(onPerfEntry);
      else if (onTTFB) onTTFB(onPerfEntry);
    }).catch(error => {
      console.warn('Web vitals could not be loaded:', error);
    });
  }
};

export default reportWebVitals;

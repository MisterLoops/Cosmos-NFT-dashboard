import { Widget } from "@skip-go/widget";
import { setApiOptions } from "@skip-go/client";
import { useEffect, useState } from "react";

const SkipWidget = ({ showSkipWidget, onClose, connectedAddresses, signers, defaultRoute }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setApiOptions({
      cumulativeAffiliateFeeBps: "200",
      chainIdsToAffiliates: {
        "interwoven-1": {
          affiliates: [
            {
              address: "init1xrrwujj7yph2kh803x4nu8s90m2nd8dg5t07z7",
              basisPointsFee: "200",
            },
          ],
        },
        // ... all your affiliate configs unchanged
      },
    });
  }, []);

  useEffect(() => {
    if (showSkipWidget) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10); // Small delay to trigger CSS transition
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [showSkipWidget]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showSkipWidget) {
        onClose();
      }
    };

    if (showSkipWidget) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showSkipWidget, onClose]);

  if (!shouldRender) return null;

  const widgetProps = {
    theme: {
      brandColor: "#FF66FF",
      borderRadius: {
        main: "25px",
        selectionButton: "10px",
        ghostButton: "30px",
        modalContainer: "20px",
        rowItem: "12px",
      },
    },
    settings: {
      slippage: 1,
      useUnlimitedApproval: true,
    },
    connectedAddresses,
    signers,
    defaultRoute:{
      destChainId: defaultRoute.destChainId ? defaultRoute.destChainId : "",
      destAssetDenom: defaultRoute.destAssetDenom ? defaultRoute.destAssetDenom : "",
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      {/* Background overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(31, 27, 46, 0.9)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
          zIndex: 0,
        }}
      />

      {/* Background decoration */}
      <div
        className="mobile-modal-bg"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "500px",
          height: "50%",
          transform: "translate(-50%, -50%)",
          backgroundImage: "url('./dark-bg.svg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,1)",
          boxShadow: "0 0 5px rgba(205,102,255,0.5)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.7s ease-in-out",
          zIndex: 1,
        }}
      />

      {/* Gradient background layer */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "500px",
          height: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "20px",
          background: "linear-gradient(90deg, #1f1b2e, #2b2340)",
          opacity: isVisible ? 0.8 : 0,
          transition: "opacity 0.7s ease-in-out",
          zIndex: 2,
        }}
      />

      {/* Close Button */}
      <button
        className="mobile-close-btn"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "calc(27.5% - 75px)",
          right: "calc(50% - 20px)",
          width: "40px",
          height: "40px",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "50%",
          color: "#fff",
          fontSize: "18px",
          cursor: "pointer",
          zIndex: 6,
          transition: "all 0.5s ease",
          backdropFilter: "blur(10px)",
        }}
        onMouseOver={(e) => {
          e.target.style.background = "rgba(255, 102, 255, 0.3)";
          e.target.style.borderColor = "rgba(255, 102, 255, 0.6)";
          e.target.style.transform = "scale(1.1)";
        }}
        onMouseOut={(e) => {
          e.target.style.background = "rgba(255,255,255,0.1)";
          e.target.style.borderColor = "rgba(255,255,255,0.3)";
          e.target.style.transform = "scale(1)";
        }}
      >
        ×
      </button>

      {/* Modal Content */}
      <div
        className="mobile-modal-content"
        style={{
          maxWidth: "500px",
          width: "100%",
          padding: "0 10px",
          position: "relative",
          transform: isVisible
            ? "scale(1) translateY(0)"
            : "scale(0.9) translateY(-20px)",
          opacity: isVisible ? 1 : 0,
          transition: "all 0.3s ease-out",
          zIndex: 5,
        }}
      >
        <Widget {...widgetProps} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-modal-bg {
            width: 90% !important;
            height: auto !important;
            max-height: 70% !important;
          }
          .mobile-modal-content {
            width: 90% !important;
            padding: 0 5px !important;
          }
          .mobile-close-btn {
            top: 25px !important;
            right: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SkipWidget;

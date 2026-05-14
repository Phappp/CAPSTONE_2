import { useRef } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";

interface JitsiRoomProps {
  roomName: string;
  userName: string;
  isHost?: boolean;
  onClose?: () => void;
  onApiReady?: (api: any) => void;
}

export const JitsiRoom: React.FC<JitsiRoomProps> = ({
  roomName,
  userName,
  isHost = false,
  onClose,
  onApiReady,
}) => {
  const apiRef = useRef<any>(null);

  const handleApiReady = (api: any) => {
    apiRef.current = api;
    onApiReady?.(api);
  };

  const handleClose = () => {
    if (apiRef.current) {
      apiRef.current.dispose();
    }
    onClose?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: "#000",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10000,
        }}
      >
        {/* <button
          onClick={handleClose}
          style={{
            backgroundColor: "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          Thoát phòng họp
        </button> */}
      </div>

      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
          disableRecordAudioNotification: true,
          disableReactions: true,
          disableShortcuts: false,
          enableClosePage: false,
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          HIDE_INVITE_MORE_HEADER: true,
          TOOLBAR_BUTTONS: isHost
            ? [
                "microphone",
                "camera",
                "desktop",
                "chat",
                "raisehand",
                "tileview",
                "hangup",
                "settings",
              ]
            : [
                "microphone",
                "camera",
                "chat",
                "raisehand",
                "tileview",
                "hangup",
                "settings",
              ],
          MOBILE_APP_PROMO: false,
          SHOW_DEEP_LINKING_IMAGE: false,
          DEFAULT_BACKGROUND: "#000",
        }}
        userInfo={{
          displayName: userName || "Học viên",
        }}
        onApiReady={handleApiReady}
        onReadyToClose={handleClose}
        getIFrameRef={(iframeRef) => {
          if (iframeRef) {
            iframeRef.style.height = "100vh";
            iframeRef.style.width = "100%";
          }
        }}
      />
    </div>
  );
};

export default JitsiRoom;

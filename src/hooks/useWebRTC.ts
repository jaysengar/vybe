import { useEffect, useRef, useState } from 'react';
let RTCPeerConnection: any = null;
let RTCIceCandidate: any = null;
let RTCSessionDescription: any = null;
let mediaDevices: any = null;
let MediaStream: any = null;
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices = webrtc.mediaDevices;
  MediaStream = webrtc.MediaStream;
} catch (e) {
  console.log('WebRTC native module not found');
  mediaDevices = {
    getUserMedia: async () => ({ getTracks: () => [] })
  };
}
import { socketService } from '../integrations/socket';
import { ICE_SERVERS } from '../integrations/webrtc';

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const currentTargetSocket = useRef<string | null>(null);
  const currentTargetUserId = useRef<string | null>(null);

  // Initialize local stream
  const initLocalStream = async () => {
    try {
      // In a real app, you would check permissions here first
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' }
      });
      setLocalStream(stream as any);
      return stream;
    } catch (err: any) {
      console.error('Error getting user media:', err);
      throw err;
    }
  };

  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks to the connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // When the remote peer adds their stream, save it to state
    peerConnection.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0] as any);
      }
    };

    // When ICE candidates are generated locally, send them to the peer
    peerConnection.onicecandidate = (event: any) => {
      if (event.candidate && currentTargetSocket.current) {
        socketService.socket?.emit('webrtc_ice_candidate', {
          targetSocketId: currentTargetSocket.current,
          candidate: event.candidate,
        });
      }
    };

    pc.current = peerConnection;
    return peerConnection;
  };

  // Called when Matchmaker finds a match
  const startCall = async (targetSocketId: string, targetUserId: string, isInitiator: boolean) => {
    currentTargetSocket.current = targetSocketId;
    currentTargetUserId.current = targetUserId;
    const peerConnection = createPeerConnection();

    if (isInitiator) {
      const offer = await peerConnection.createOffer({});
      await peerConnection.setLocalDescription(offer);
      socketService.socket?.emit('webrtc_offer', {
        targetSocketId,
        sdp: offer,
      });
    }
  };

  const endCall = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setRemoteStream(null);
    if (currentTargetSocket.current) {
        socketService.socket?.emit('leave_call', { targetSocketId: currentTargetSocket.current });
    }
    currentTargetSocket.current = null;
  };

  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    socket.on('webrtc_offer', async (data) => {
      currentTargetSocket.current = data.senderSocketId;
      const peerConnection = pc.current || createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('webrtc_answer', {
        targetSocketId: data.senderSocketId,
        sdp: answer,
      });
    });

    socket.on('webrtc_answer', async (data) => {
      if (pc.current) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socket.on('webrtc_ice_candidate', async (data) => {
      if (pc.current) {
        await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('peer_left', () => {
      endCall();
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('peer_left');
    };
  }, [localStream]);

  // Handle Mute/Camera flip
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  };

  const toggleCamera = () => {
     if (localStream) {
        localStream.getVideoTracks().forEach(track => {
           track._switchCamera();
        });
     }
  };

  return {
    localStream,
    remoteStream,
    currentTargetUserId,
    currentTargetSocket,
    initLocalStream,
    startCall,
    endCall,
    toggleMute,
    toggleCamera
  };
};

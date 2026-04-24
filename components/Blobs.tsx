export default function Blobs() {
  return (
    <>
      <span className="blob" style={{ left: -150, top: -120, width: 520, height: 520, background: "#ffc0cb", animation: "blobDrift 22s ease-in-out infinite" }} />
      <span className="blob" style={{ right: -180, top: "30%", width: 600, height: 600, background: "#d5b3f0", animation: "blobDrift 22s ease-in-out infinite -7s" }} />
      <span className="blob" style={{ left: "30%", bottom: -140, width: 480, height: 480, background: "#ffd49e", animation: "blobDrift 22s ease-in-out infinite -14s" }} />
      <style>{`@keyframes blobDrift {0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(40px,-30px) scale(1.08);}66%{transform:translate(-30px,40px) scale(0.96);}}`}</style>
    </>
  );
}

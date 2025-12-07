export default function ScoreBoard({ score }) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 text-white font-mono text-xl z-50">
      Score: {score}
    </div>
  );
}
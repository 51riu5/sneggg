export default function Spotify() {
  const id = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST ?? "6LUsXD61YZWpwPZCzx9UWB";
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="kicker">our playlist</p>
          <h3 className="font-serif text-2xl mt-2">നിശാഗന്ധി · lavender haze</h3>
        </div>
        <p className="text-xs text-ink-mute italic">with love, ribtu</p>
      </div>
      <div className="rounded-2xl overflow-hidden">
        <iframe
          title="Our playlist"
          src={`https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    </div>
  );
}

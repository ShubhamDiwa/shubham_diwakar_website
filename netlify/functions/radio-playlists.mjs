const channelHandle = '@thecuriousfeed21';

async function youtube(resource, params, apiKey, signal) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  url.search = new URLSearchParams({ ...params, key: apiKey });
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`YouTube API returned ${response.status}`);
  return response.json();
}

export default async function radioPlaylists(request) {
  if (request.method !== 'GET') {
    return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  }
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: 'Playlist sync is not configured.' }, { status: 503 });
  }

  try {
    const signal = AbortSignal.timeout(8000);
    const channels = await youtube('channels', { part: 'id', forHandle: channelHandle }, apiKey, signal);
    const channelId = channels.items?.[0]?.id;
    if (!channelId) throw new Error('YouTube channel not found');

    const playlists = [];
    let pageToken;
    do {
      const page = await youtube('playlists', {
        part: 'snippet,status',
        channelId,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {})
      }, apiKey, signal);
      for (const item of page.items ?? []) {
        if (item.status?.privacyStatus === 'public' && item.snippet?.title && /^[\w-]+$/.test(item.id ?? '')) {
          playlists.push({ id: item.id, title: item.snippet.title });
        }
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    const playlistId = new URL(request.url).searchParams.get('playlist');
    let tracks;
    if (playlistId) {
      if (!playlists.some(playlist => playlist.id === playlistId)) {
        return Response.json({ error: 'Playlist not found.' }, { status: 404 });
      }
      tracks = [];
      let nextPage;
      do {
        const page = await youtube('playlistItems', {
          part: 'snippet,status', playlistId, maxResults: '50',
          ...(nextPage ? { pageToken: nextPage } : {})
        }, apiKey, signal);
        for (const item of page.items ?? []) {
          const snippet = item.snippet;
          if (item.status?.privacyStatus !== 'public' || !/^[\w-]+$/.test(snippet?.resourceId?.videoId ?? '')) continue;
          tracks.push({
            videoId: snippet.resourceId.videoId,
            title: snippet.title,
            artist: snippet.videoOwnerChannelTitle || '',
            position: snippet.position
          });
        }
        nextPage = page.nextPageToken;
      } while (nextPage);
    }
    return Response.json(tracks ? { tracks } : { playlists }, { headers: {
      'Cache-Control': 'public, max-age=60',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=300'
    } });
  } catch {
    return Response.json({ error: 'Could not load YouTube playlists.' }, { status: 502 });
  }
}

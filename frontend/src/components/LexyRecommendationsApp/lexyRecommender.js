export async function getLexyRecommendations({ features, type, tone }) {
  const res = await fetch('/api/v1/lexy/recommendations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ features, type, tone }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || `Failed to fetch recommendations (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return data;
}

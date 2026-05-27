export async function getGooglePlacePhotoUrl(params: {
  photoName: string
  apiKey: string
  maxWidthPx?: number
  maxHeightPx?: number
}): Promise<string | null> {
  const { photoName, apiKey, maxWidthPx = 320, maxHeightPx } = params

  const searchParams = new URLSearchParams()

  if (maxHeightPx) {
    searchParams.set('maxHeightPx', String(maxHeightPx))
  } else {
    searchParams.set('maxWidthPx', String(maxWidthPx))
  }

  searchParams.set('skipHttpRedirect', 'true')

  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?${searchParams.toString()}`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    },
  )

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { photoUri?: string }

  return data.photoUri ?? null
}

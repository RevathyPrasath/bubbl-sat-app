export async function GET() {
  return Response.json({ status: 'ok', app: 'Bubbl API', version: '1.0.0' })
}

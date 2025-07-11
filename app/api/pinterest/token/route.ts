// import { NextRequest, NextResponse } from 'next/server';

// export async function POST(request: NextRequest) {
//   try {
//     const { code, clientId, clientSecret, redirectUrl } = await request.json();

//     if (!code || !clientId || !clientSecret || !redirectUrl) {
//       return NextResponse.json(
//         { error: 'Missing required parameters' },
//         { status: 400 }
//       );
//     }

//     // Pinterest OAuth token endpoint
//     const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
//     const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

//     console.log('Fetching Pinterest token with params:', {
//       code: code.substring(0, 10) + '...',
//       clientId: clientId.substring(0, 10) + '...',
//       redirectUrl
//     });

//     const response = await fetch(tokenUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'Authorization': `Basic ${basicAuth}`
//       },
//       body: new URLSearchParams({
//         grant_type: 'authorization_code',
//         code,
//         redirect_uri: redirectUrl
//       }).toString()
//     });

//     const responseText = await response.text();
//     let responseData;

//     try {
//       responseData = JSON.parse(responseText);
//     } catch (
//       // eslint-disable-next-line @typescript-eslint/no-unused-vars
//       _e
//     ) {
//       console.error('Failed to parse Pinterest response:', responseText);
//       return NextResponse.json(
//         { 
//           error: 'Invalid response from Pinterest',
//           details: responseText
//         },
//         { status: 502 }
//       );
//     }

//     if (!response.ok) {
//       console.error('Pinterest API error:', responseData);
//       return NextResponse.json(
//         { 
//           error: 'Failed to fetch Pinterest token',
//           details: responseData
//         },
//         { status: response.status }
//       );
//     }

//     if (!responseData.access_token) {
//       console.error('No access token in response:', responseData);
//       return NextResponse.json(
//         { 
//           error: 'No access token in response',
//           details: responseData
//         },
//         { status: 502 }
//       );
//     }

//     console.log('Successfully retrieved Pinterest token');
//     return NextResponse.json(responseData.access_token);

//   } catch (error) {
//     console.error('Error in Pinterest token endpoint:', error);
//     return NextResponse.json(
//       { 
//         error: 'Internal server error',
//         message: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     );
//   }
// } 
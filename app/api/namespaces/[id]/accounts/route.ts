import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: namespaceId } = await context.params;
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Fetch accounts from the external API
    const response = await fetch(`${API_BASE_URL}/namespaces/${namespaceId}/accounts`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching namespace accounts:', error);
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Unknown error occurred' } },
      { status: 500 }
    );
  }
} 
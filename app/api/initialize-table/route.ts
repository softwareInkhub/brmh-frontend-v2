import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

interface TableData {
  namespaceName: string;
  accountName: string;
  methodName: string;
  data: Record<string, unknown>;
}

interface DynamoDBTable {
  name: string;
  // Add other table properties as needed
}

export async function POST(request: NextRequest) {
  try {
    const body: TableData = await request.json();
    const { namespaceName, accountName, methodName } = body;

    if (!namespaceName || !accountName || !methodName) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'namespaceName, accountName, and methodName are required'
      }, { status: 400 });
    }

    // Create table name by combining namespace, account and method names
    const tableName = `${namespaceName}_${accountName}_${methodName}`.replace(/\s+/g, '_').toLowerCase();
    console.log('Checking for table:', tableName);

    // First, check if table exists
    console.log('Fetching existing tables from:', `${process.env.NEXT_PUBLIC_AWS_URL}/api/dynamodb/tables`);
    const tablesResponse = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/dynamodb/tables`);
    
    if (!tablesResponse.ok) {
      console.error('Failed to fetch tables. Status:', tablesResponse.status);
      throw new Error('Failed to fetch existing tables');
    }

    const existingTables = await tablesResponse.json();
    console.log('Existing tables:', existingTables);

    const tableExists = existingTables.some((table: DynamoDBTable) => {
      const exists = table.name === tableName;
      console.log(`Comparing ${table.name} with ${tableName}: ${exists}`);
      return exists;
    });

    if (tableExists) {
      console.log(`Table ${tableName} already exists`);
      return NextResponse.json({
        error: 'Table already exists',
        message: `Table ${tableName} already exists`,
        tableName
      }, { status: 409 });
    }

    console.log(`Table ${tableName} does not exist, proceeding with creation`);

    // Prepare the table creation data
    const tableData = {
      name: tableName,
      partitionKey: {
        name: "id",
        type: "String"
      },
      sortKey: null,
      useProvisioned: false
    };

    console.log('Creating DynamoDB table with data:', JSON.stringify(tableData, null, 2));

    try {
      // Make request to create DynamoDB table
      const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_URL}/api/dynamodb/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response:', responseText);
        return NextResponse.json({
          error: 'Invalid response from DynamoDB API',
          message: 'Received non-JSON response from server',
          details: responseText.substring(0, 200)
        }, { status: 500 });
      }

      if (!response.ok) {
        console.error('Error response from DynamoDB API:', result);
        return NextResponse.json({
          error: 'DynamoDB API error',
          message: result.message || 'Failed to create table',
          details: result
        }, { status: response.status });
      }

      console.log('Table creation successful:', result);
      
      return NextResponse.json({
        message: 'Table initialized successfully',
        tableName,
        ...result
      }, { status: 201 });

    } catch (fetchError) {
      console.error('Network error:', fetchError);
      return NextResponse.json({
        error: 'Network error',
        message: 'Failed to connect to DynamoDB API',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Error initializing table:', error);
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : 'Unknown error occurred' } },
      { status: 500 }
    );
  }
} 
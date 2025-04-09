# API Builder Documentation

## Mock Server Functionality

The Mock Server in this application provides a way to visualize and simulate API endpoints based on your OpenAPI specification.

### How the Mock Server Works

#### 1. UI Simulation
- The mock server is a **user interface simulation** for demonstration purposes
- It shows how a real mock server would work in a production environment
- **Important:** No actual server is started on the specified port
- All interactions are simulated within the browser

#### 2. Configuration Options
- **Port**: Simulates configuring which port the mock server would run on
- **Response Delay**: Demonstrates how you could add artificial delay to simulate network latency
- **CORS**: Shows enabling/disabling Cross-Origin Resource Sharing in a real server
- **Request Validation**: Illustrates how validation could be configured

#### 3. Response Generation
- The application visualizes how response generation would work in a production implementation
- Sample responses are shown based on your API schema definitions
- No actual HTTP endpoints are created

#### 4. Current Implementation
The mock server in this application is a **demonstration simulation** that:
- Shows the UI of how a real mock server would work
- Provides a visual representation of the API endpoints from your spec
- Does not actually start a server or listen on any ports
- Is suitable for UI demonstration and educational purposes only

### Using the Mock Server Demo

1. Define your API using the API Builder
2. Navigate to the "Mock Server" tab
3. Configure demo server settings as needed
4. Click "Start Mock Server" to see the simulation
5. View the simulated API endpoints generated from your specification

## Testing Functionality

The application provides a Test Suite feature to demonstrate how API testing might work.

### Test Suite Implementation

#### 1. Test Visualization
- The Test Suite is also a UI simulation for demonstration purposes
- Tests are visually generated based on your OpenAPI specification
- No actual HTTP requests are made to endpoints

#### 2. Test Categories
The simulation shows different types of tests that would be available:
- **Validation Tests**: To ensure requests are properly validated
- **Response Tests**: To verify responses match expected schemas
- **Error Handling Tests**: To check error responses

#### 3. Test Execution Simulation
- The test runner simulates test execution
- Results are shown for demonstration purposes
- No actual API calls are made

#### 4. Current Implementation
The test suite is a **UI demonstration** that:
- Shows how a real testing system might look
- Generates visual test cases based on your specification
- Does not perform actual HTTP requests
- Is designed for educational and demonstration purposes

## Implementation Notes

### Mock Server Technical Details
- This is a UI-only implementation for demonstration purposes
- No actual server is started, and no ports are used
- The interface simulates what a real implementation would look like
- The port entry field is for demonstration only

### Known Limitations

- The mock server is a simulation and does not actually start an HTTP server
- No actual endpoints are created on the specified port
- Clicking "Test in browser" will not show actual API responses
- The port configuration has no actual effect on network usage

## For Actual Mock Server Functionality

If you need a real functioning mock server, consider:

1. Running a separate mock server tool such as Prism, Mockoon, or Postman Mock Server
2. Implementing a real server-side component using Express or similar
3. Using a third-party API mocking service

In a production implementation, a real mock server would:
- Actually bind to the specified port
- Create real HTTP endpoints
- Respond to actual HTTP requests
- Support real-world testing scenarios

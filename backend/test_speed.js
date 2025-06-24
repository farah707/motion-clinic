import axios from 'axios';

async function testResponseTime() {
  const testQueries = [
    'headache',
    'fever',
    'back pain',
    'cough',
    'knee pain'
  ];

  console.log('Testing AI Chat Response Times...\n');

  for (const query of testQueries) {
    try {
      console.log(`Testing query: "${query}"`);
      const startTime = Date.now();
      
      const response = await axios.post('http://localhost:4000/api/ai/chat', {
        message: query
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`✅ Response time: ${responseTime}ms`);
      console.log(`Response: ${response.data.response.substring(0, 100)}...`);
      console.log(`From cache: ${response.data.fromCache ? 'Yes' : 'No'}`);
      console.log(`From RAG: ${response.data.fromRAG ? 'Yes' : 'No'}`);
      console.log('---\n');
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error testing "${query}":`, error.message);
    }
  }
}

testResponseTime().catch(console.error); 
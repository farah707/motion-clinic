import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testChatFlow = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb+srv://farahtarek707:Ihf29082003@grad.o1ebv.mongodb.net/?retryWrites=true&w=majority&appName=GRAD';
    
    console.log('🔍 Testing Chat Flow...');
    await mongoose.connect(uri, { dbName: 'clinic' });
    
    // Check if any new chat history documents exist
    const collection = mongoose.connection.db.collection('chathistories');
    const count = await collection.countDocuments();
    
    console.log(`\n📊 Total chat history documents: ${count}`);
    
    if (count > 0) {
      // Get the most recent documents
      const recentDocs = await collection.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      console.log('\n📝 Recent chat sessions:');
      recentDocs.forEach((doc, index) => {
        console.log(`\n--- Session ${index + 1} ---`);
        console.log(`Type: ${doc.type || 'Unknown'}`);
        console.log(`User ID: ${doc.userId || 'Not set'}`);
        console.log(`Session ID: ${doc.sessionId || 'Not set'}`);
        console.log(`Title: ${doc.title || 'No title'}`);
        console.log(`Messages: ${doc.messages ? doc.messages.length : 0}`);
        console.log(`Created: ${doc.createdAt || 'Not set'}`);
        
        if (doc.messages && doc.messages.length > 0) {
          console.log('\n  Messages:');
          doc.messages.forEach((msg, msgIndex) => {
            console.log(`    ${msgIndex + 1}. [${msg.role}] ${msg.content?.substring(0, 50)}...`);
          });
        }
      });
    } else {
      console.log('\n❌ No chat history documents found.');
      console.log('💡 Try sending a message in the AI Chat or uploading an image for analysis.');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testChatFlow(); 
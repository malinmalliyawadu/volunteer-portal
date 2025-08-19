const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate random profile images using randomuser.me
function generateRandomProfileImages() {
  const profileMap = [
    { email: 'sarah.chen@gmail.com', gender: 'women' },
    { email: 'james.williams@hotmail.com', gender: 'men' },
    { email: 'priya.patel@yahoo.com', gender: 'women' },
    { email: 'mike.johnson@outlook.com', gender: 'men' },
    { email: 'alex.taylor@gmail.com', gender: 'men' },
    { email: 'maria.gonzalez@gmail.com', gender: 'women' },
    { email: 'tom.brown@hotmail.com', gender: 'men' },
    { email: 'lucy.kim@yahoo.com', gender: 'women' },
    { email: 'volunteer@example.com', gender: 'women' },
    { email: 'admin@everybodyeats.nz', gender: 'men' },
  ];

  return profileMap.map(({ email, gender }) => {
    // Generate random number between 0-99 for profile diversity
    const randomId = Math.floor(Math.random() * 100);
    const filename = `${email.split('@')[0].replace('.', '-')}-${randomId}.jpg`;
    
    return {
      url: `https://randomuser.me/api/portraits/${gender}/${randomId}.jpg`,
      filename,
      email,
    };
  });
}

function downloadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const mimeType = 'image/jpeg';
          resolve(`data:${mimeType};base64,${base64}`);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function refreshRandomProfileImages() {
  console.log('🎲 Refreshing all profile photos with new random images...\n');
  
  const profileImages = generateRandomProfileImages();
  let successCount = 0;
  let failCount = 0;
  
  for (const image of profileImages) {
    try {
      console.log(`📸 Generating new random photo for ${image.email}...`);
      
      // Download image directly as base64
      const base64Data = await downloadImageAsBase64(image.url);
      
      if (base64Data) {
        const result = await prisma.user.updateMany({
          where: { email: image.email },
          data: { profilePhotoUrl: base64Data }
        });
        
        if (result.count > 0) {
          console.log(`✅ Updated ${image.email} with new random image (ID: ${image.url.split('/').pop()})`);
          successCount++;
        } else {
          console.log(`⚠️  User ${image.email} not found in database`);
          failCount++;
        }
      }
      
      // Add delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 400));
      
    } catch (error) {
      console.log(`❌ Failed to process ${image.email}: ${error.message}`);
      failCount++;
      
      // Try a fallback image
      try {
        const fallbackId = Math.floor(Math.random() * 50);
        const gender = image.url.includes('/women/') ? 'women' : 'men';
        const fallbackUrl = `https://randomuser.me/api/portraits/${gender}/${fallbackId}.jpg`;
        const fallbackBase64 = await downloadImageAsBase64(fallbackUrl);
        
        if (fallbackBase64) {
          await prisma.user.updateMany({
            where: { email: image.email },
            data: { profilePhotoUrl: fallbackBase64 }
          });
          console.log(`✅ Updated ${image.email} with fallback random image (ID: ${fallbackId})`);
          successCount++;
          failCount--;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (fallbackError) {
        console.log(`❌ Fallback also failed for ${image.email}`);
      }
    }
  }
  
  console.log(`\n🎉 Profile refresh completed!`);
  console.log(`✅ Successfully updated: ${successCount} profiles`);
  console.log(`❌ Failed to update: ${failCount} profiles`);
  console.log(`\nUsers now have fresh random profile photos! 📸`);
}

async function main() {
  try {
    await refreshRandomProfileImages();
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { addDays, set, subYears, subMonths, subDays } = require("date-fns");
const fs = require('fs');
const path = require('path');
const https = require('https');

const prisma = new PrismaClient();

// Generate random profile images using randomuser.me
function generateRandomProfileImages() {
  const profileMap = [
    { email: 'sarah.chen@gmail.com', gender: 'women' },
    { email: 'james.williams@hotmail.com', gender: 'men' },
    { email: 'priya.patel@yahoo.com', gender: 'women' },
    { email: 'mike.johnson@outlook.com', gender: 'men' },
    { email: 'alex.taylor@gmail.com', gender: 'men' }, // Alex is they/them but using men category
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

// Generate profile images with randomness
const profileImages = generateRandomProfileImages();


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

async function downloadAndConvertProfileImages() {
  console.log('🎲 Generating random profile photos from randomuser.me...\n');
  
  for (const image of profileImages) {
    try {
      console.log(`📸 Processing ${image.email} with random photo...`);
      
      // Download image directly as base64 (no file storage needed)
      const base64Data = await downloadImageAsBase64(image.url);
      
      if (base64Data) {
        await prisma.user.updateMany({
          where: { email: image.email },
          data: { profilePhotoUrl: base64Data }
        });
        console.log(`✅ Updated random profile image for ${image.email}`);
      }
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`⚠️ Failed to process ${image.email}: ${error.message}`);
      // Try a fallback image
      try {
        const fallbackId = Math.floor(Math.random() * 50); // Different random range for fallback
        const gender = image.url.includes('/women/') ? 'women' : 'men';
        const fallbackUrl = `https://randomuser.me/api/portraits/${gender}/${fallbackId}.jpg`;
        const fallbackBase64 = await downloadImageAsBase64(fallbackUrl);
        
        if (fallbackBase64) {
          await prisma.user.updateMany({
            where: { email: image.email },
            data: { profilePhotoUrl: fallbackBase64 }
          });
          console.log(`✅ Updated ${image.email} with fallback random image`);
        }
      } catch (fallbackError) {
        console.log(`❌ Fallback also failed for ${image.email}`);
      }
    }
  }
  
  console.log('✅ Random profile images processing completed\n');
}

// Realistic sample data
const REALISTIC_VOLUNTEERS = [
  {
    email: "sarah.chen@gmail.com",
    firstName: "Sarah",
    lastName: "Chen",
    phone: "+64 21 234 5678",
    dateOfBirth: subYears(new Date(), 28),
    pronouns: "she/her",
    emergencyContactName: "David Chen",
    emergencyContactRelationship: "Partner",
    emergencyContactPhone: "+64 21 987 6543",
    medicalConditions: "No known allergies",
    willingToProvideReference: true,
    howDidYouHearAboutUs: "Instagram",
    availableDays: JSON.stringify(["Monday", "Wednesday", "Friday"]),
    availableLocations: JSON.stringify(["Wellington", "Glenn Innes"]),
    emailNewsletterSubscription: true,
    notificationPreference: "BOTH",
 // Empty array means all types
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "james.williams@hotmail.com",
    firstName: "James",
    lastName: "Williams",
    phone: "+64 27 345 6789",
    dateOfBirth: subYears(new Date(), 34),
    pronouns: "he/him",
    emergencyContactName: "Emma Williams",
    emergencyContactRelationship: "Wife",
    emergencyContactPhone: "+64 27 456 7890",
    medicalConditions: "Mild asthma - carries inhaler",
    willingToProvideReference: true,
    howDidYouHearAboutUs: "Friend recommendation",
    availableDays: JSON.stringify(["Tuesday", "Thursday", "Saturday"]),
    availableLocations: JSON.stringify(["Wellington"]),
    emailNewsletterSubscription: true,
    notificationPreference: "EMAIL",
 // Empty array means all types
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "priya.patel@yahoo.com",
    firstName: "Priya",
    lastName: "Patel",
    phone: "+64 22 456 7890",
    dateOfBirth: subYears(new Date(), 25),
    pronouns: "she/her",
    emergencyContactName: "Raj Patel",
    emergencyContactRelationship: "Father",
    emergencyContactPhone: "+64 22 567 8901",
    medicalConditions: "Vegetarian diet, no medical conditions",
    willingToProvideReference: false,
    howDidYouHearAboutUs: "Facebook",
    availableDays: JSON.stringify(["Monday", "Tuesday", "Sunday"]),
    availableLocations: JSON.stringify(["Glenn Innes", "Onehunga"]),
    emailNewsletterSubscription: false,
    notificationPreference: "SMS",
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [],
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "mike.johnson@outlook.com",
    firstName: "Mike",
    lastName: "Johnson",
    phone: "+64 21 567 8901",
    dateOfBirth: subYears(new Date(), 42),
    pronouns: "he/him",
    emergencyContactName: "Lisa Johnson",
    emergencyContactRelationship: "Sister",
    emergencyContactPhone: "+64 21 678 9012",
    medicalConditions: "None",
    willingToProvideReference: true,
    howDidYouHearAboutUs: "Community notice board",
    availableDays: JSON.stringify(["Wednesday", "Friday", "Saturday"]),
    availableLocations: JSON.stringify(["Wellington", "Onehunga"]),
    emailNewsletterSubscription: true,
    notificationPreference: "EMAIL",
 // Empty array means all types
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "alex.taylor@gmail.com",
    firstName: "Alex",
    lastName: "Taylor",
    phone: "+64 29 678 9012",
    dateOfBirth: subYears(new Date(), 19),
    pronouns: "they/them",
    emergencyContactName: "Morgan Taylor",
    emergencyContactRelationship: "Parent",
    emergencyContactPhone: "+64 29 789 0123",
    medicalConditions: "Lactose intolerant",
    willingToProvideReference: false,
    howDidYouHearAboutUs: "University volunteer fair",
    availableDays: JSON.stringify(["Thursday", "Friday", "Sunday"]),
    availableLocations: JSON.stringify(["Glenn Innes"]),
    emailNewsletterSubscription: true,
    notificationPreference: "BOTH",
 // Empty array means all types
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "maria.gonzalez@gmail.com",
    firstName: "Maria",
    lastName: "Gonzalez",
    phone: "+64 22 789 0123",
    dateOfBirth: subYears(new Date(), 31),
    pronouns: "she/her",
    emergencyContactName: "Carlos Gonzalez",
    emergencyContactRelationship: "Husband",
    emergencyContactPhone: "+64 22 890 1234",
    medicalConditions: "No medical conditions",
    willingToProvideReference: true,
    howDidYouHearAboutUs: "Google search",
    availableDays: JSON.stringify(["Monday", "Wednesday", "Thursday"]),
    availableLocations: JSON.stringify(["Onehunga"]),
    emailNewsletterSubscription: true,
    notificationPreference: "EMAIL",
 // Empty array means all types
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "tom.brown@hotmail.com",
    firstName: "Tom",
    lastName: "Brown",
    phone: "+64 27 890 1234",
    dateOfBirth: subYears(new Date(), 56),
    pronouns: "he/him",
    emergencyContactName: "Jennifer Brown",
    emergencyContactRelationship: "Daughter",
    emergencyContactPhone: "+64 27 901 2345",
    medicalConditions: "Type 2 diabetes - well controlled",
    willingToProvideReference: true,
    howDidYouHearAboutUs: "Local newspaper",
    availableDays: JSON.stringify(["Tuesday", "Wednesday", "Saturday"]),
    availableLocations: JSON.stringify([
      "Wellington",
      "Glenn Innes",
      "Onehunga",
    ]),
    emailNewsletterSubscription: true,
    notificationPreference: "EMAIL",
 // Empty array means all types
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
  {
    email: "lucy.kim@yahoo.com",
    firstName: "Lucy",
    lastName: "Kim",
    phone: "+64 21 901 2345",
    dateOfBirth: subYears(new Date(), 23),
    pronouns: "she/her",
    emergencyContactName: "Grace Kim",
    emergencyContactRelationship: "Mother",
    emergencyContactPhone: "+64 21 012 3456",
    medicalConditions: "Mild peanut allergy",
    willingToProvideReference: false,
    howDidYouHearAboutUs: "TikTok",
    availableDays: JSON.stringify(["Friday", "Saturday", "Sunday"]),
    availableLocations: JSON.stringify(["Wellington"]),
    emailNewsletterSubscription: false,
    notificationPreference: "SMS",
    receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [],
    volunteerAgreementAccepted: true,
    healthSafetyPolicyAccepted: true,
  },
];

async function main() {
  const adminEmail = "admin@everybodyeats.nz";
  const volunteerEmail = "volunteer@example.com";

  const adminHash = await bcrypt.hash("admin123", 10);
  const volunteerHash = await bcrypt.hash("volunteer123", 10);

  // Track user signups by date to prevent multiple signups per day
  const userDailySignups = new Map(); // userId -> Set of date strings
  
  // Helper function to check if user can sign up for a shift on a given date
  function canUserSignUpForDate(userId, shiftDate) {
    const dateKey = shiftDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!userDailySignups.has(userId)) {
      userDailySignups.set(userId, new Set());
    }
    
    return !userDailySignups.get(userId).has(dateKey);
  }
  
  // Helper function to record a user signup for a date
  function recordUserSignup(userId, shiftDate) {
    const dateKey = shiftDate.toISOString().split('T')[0];
    
    if (!userDailySignups.has(userId)) {
      userDailySignups.set(userId, new Set());
    }
    
    userDailySignups.get(userId).add(dateKey);
  }

  // Create admin user
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      phone: "+64 21 123 4567",
      hashedPassword: adminHash,
      role: "ADMIN",
      volunteerAgreementAccepted: true,
      healthSafetyPolicyAccepted: true,
      notificationPreference: "EMAIL",
    },
  });

  // Create main sample volunteer with full profile (YELLOW grade - experienced)
  const volunteer = await prisma.user.upsert({
    where: { email: volunteerEmail },
    update: {},
    create: {
      email: volunteerEmail,
      firstName: "Sample",
      lastName: "Volunteer",
      name: "Sample Volunteer",
      phone: "+64 21 555 0001",
      dateOfBirth: subYears(new Date(), 26),
      pronouns: "she/her",
      emergencyContactName: "John Volunteer",
      emergencyContactRelationship: "Brother",
      emergencyContactPhone: "+64 21 555 0002",
      medicalConditions: "None",
      willingToProvideReference: true,
      howDidYouHearAboutUs: "Website",
      availableDays: JSON.stringify(["Monday", "Wednesday", "Friday"]),
      availableLocations: JSON.stringify(["Wellington", "Glenn Innes"]),
      emailNewsletterSubscription: true,
      notificationPreference: "EMAIL",
 // Empty array means all types
      receiveShortageNotifications: true,
    excludedShortageNotificationTypes: [], // Empty array means all types
      volunteerAgreementAccepted: true,
      healthSafetyPolicyAccepted: true,
      hashedPassword: volunteerHash,
      role: "VOLUNTEER",
      volunteerGrade: "YELLOW", // Experienced volunteer for testing auto-approval
      createdAt: subMonths(new Date(), 6), // Been volunteering for 6 months
    },
  });

  // Create realistic volunteers with varied grades
  const extraVolunteers = [];
  const gradeDistribution = [
    "YELLOW", // Sarah - experienced volunteer
    "PINK",   // James - shift leader
    "GREEN",  // Priya - newer volunteer  
    "YELLOW", // Mike - experienced
    "GREEN",  // Alex - student, newer
    "PINK",   // Maria - shift leader
    "YELLOW", // Tom - experienced older volunteer
    "GREEN",  // Lucy - newer young volunteer
  ];

  for (let i = 0; i < REALISTIC_VOLUNTEERS.length; i++) {
    const volunteerData = REALISTIC_VOLUNTEERS[i];
    const volunteerGrade = gradeDistribution[i] || "GREEN"; // Default to GREEN if not specified
    
    const u = await prisma.user.upsert({
      where: { email: volunteerData.email },
      update: {},
      create: {
        ...volunteerData,
        name: `${volunteerData.firstName} ${volunteerData.lastName}`,
        hashedPassword: volunteerHash,
        role: "VOLUNTEER",
        volunteerGrade: volunteerGrade,
      },
    });
    extraVolunteers.push(u);
  }

  // Create additional simple volunteers for testing capacity limits
  for (let i = 1; i <= 12; i++) {
    const email = `vol${i}@example.com`;
    const firstNames = [
      "Emma",
      "Liam",
      "Olivia",
      "Noah",
      "Ava",
      "Oliver",
      "Isabella",
      "Ethan",
      "Sophia",
      "Lucas",
      "Mia",
      "Mason",
    ];
    const lastNames = [
      "Smith",
      "Wilson",
      "Davis",
      "Miller",
      "Anderson",
      "Clark",
      "Lewis",
      "Walker",
      "Hall",
      "Young",
      "King",
      "Wright",
    ];

    const firstName = firstNames[(i - 1) % firstNames.length];
    const lastName = lastNames[(i - 1) % lastNames.length];
    const age = 20 + (i % 40); // Ages between 20-59

    // Distribute grades across the additional volunteers
    // Pattern: GREEN (newer), YELLOW (experienced), PINK (leaders), repeat
    // This creates: GREEN, YELLOW, PINK, GREEN, YELLOW, PINK, etc.
    const additionalGrades = ["GREEN", "YELLOW", "PINK"];
    const volunteerGrade = additionalGrades[(i - 1) % 3];

    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone: `+64 21 555 ${String(i).padStart(4, "0")}`,
        dateOfBirth: subYears(new Date(), age),
        pronouns:
          i % 3 === 0 ? "they/them" : i % 2 === 0 ? "she/her" : "he/him",
        emergencyContactName: `Emergency Contact ${i}`,
        emergencyContactRelationship:
          i % 3 === 0 ? "Friend" : i % 2 === 0 ? "Parent" : "Sibling",
        emergencyContactPhone: `+64 21 666 ${String(i).padStart(4, "0")}`,
        medicalConditions: i % 4 === 0 ? "No known conditions" : "None",
        willingToProvideReference: i % 3 === 0,
        howDidYouHearAboutUs: [
          "Website",
          "Social media",
          "Friend",
          "Community board",
        ][i % 4],
        availableDays: JSON.stringify(
          [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].slice(0, (i % 4) + 2)
        ),
        availableLocations: JSON.stringify(
          ["Wellington", "Glenn Innes", "Onehunga"].slice(0, (i % 3) + 1)
        ),
        emailNewsletterSubscription: i % 2 === 0,
        notificationPreference: ["EMAIL", "SMS", "BOTH", "NONE"][i % 4],
 // Empty array means all types
        receiveShortageNotifications: true,
        excludedShortageNotificationTypes: [], // Empty array means all types
        volunteerAgreementAccepted: true,
        healthSafetyPolicyAccepted: true,
        hashedPassword: volunteerHash,
        role: "VOLUNTEER",
        volunteerGrade: volunteerGrade,
      },
    });
    extraVolunteers.push(u);
  }

  // Create friend relationships for sample volunteer
  console.log("👫 Seeding friend relationships...");
  
  // Sample volunteer's existing friends (bidirectional friendships)
  const existingFriends = [
    extraVolunteers.find(v => v.email === "sarah.chen@gmail.com"),
    extraVolunteers.find(v => v.email === "james.williams@hotmail.com"),
    extraVolunteers.find(v => v.email === "priya.patel@yahoo.com"),
    extraVolunteers.find(v => v.email === "vol1@example.com"),
    extraVolunteers.find(v => v.email === "vol3@example.com"),
  ].filter(Boolean);

  // Create bidirectional friendships
  for (const friend of existingFriends) {
    try {
      // Create friendship from sample volunteer to friend
      await prisma.friendship.create({
        data: {
          userId: volunteer.id,
          friendId: friend.id,
          status: "ACCEPTED",
          initiatedBy: volunteer.id,
          createdAt: subDays(new Date(), Math.floor(Math.random() * 60) + 30), // 30-90 days ago
        },
      });

      // Create friendship from friend to sample volunteer
      await prisma.friendship.create({
        data: {
          userId: friend.id,
          friendId: volunteer.id,
          status: "ACCEPTED",
          initiatedBy: volunteer.id,
          createdAt: subDays(new Date(), Math.floor(Math.random() * 60) + 30), // Same date as above
        },
      });
    } catch (error) {
      // Skip if friendship already exists
      if (!error.message.includes('Unique constraint')) {
        throw error;
      }
    }
  }

  // Create pending friend requests TO the sample volunteer
  const pendingRequesters = [
    extraVolunteers.find(v => v.email === "mike.johnson@outlook.com"),
    extraVolunteers.find(v => v.email === "vol5@example.com"),
    extraVolunteers.find(v => v.email === "vol7@example.com"),
  ].filter(Boolean);

  for (const requester of pendingRequesters) {
    try {
      await prisma.friendRequest.create({
        data: {
          fromUserId: requester.id,
          toEmail: volunteer.email,
          message: [
            "Hey! I saw you volunteering last week. Would love to coordinate our shifts!",
            "Let's be friends so we can volunteer together!",
            "Would be great to connect and volunteer as a team!",
          ][Math.floor(Math.random() * 3)],
          status: "PENDING",
          expiresAt: addDays(new Date(), 30), // 30 days from now
          createdAt: subDays(new Date(), Math.floor(Math.random() * 7) + 1), // 1-7 days ago
        },
      });
    } catch (error) {
      // Skip if request already exists
      if (!error.message.includes('Unique constraint')) {
        throw error;
      }
    }
  }

  // Create some sent friend requests FROM the sample volunteer
  const sentRequestTargets = [
    "alex.taylor@gmail.com",
    "vol9@example.com",
  ];

  for (const targetEmail of sentRequestTargets) {
    try {
      await prisma.friendRequest.create({
        data: {
          fromUserId: volunteer.id,
          toEmail: targetEmail,
          message: "Hi! Would love to be friends and volunteer together sometime!",
          status: "PENDING",
          expiresAt: addDays(new Date(), 30),
          createdAt: subDays(new Date(), Math.floor(Math.random() * 5) + 2), // 2-6 days ago
        },
      });
    } catch (error) {
      // Skip if request already exists
      if (!error.message.includes('Unique constraint')) {
        throw error;
      }
    }
  }

  // Create some friendships between other volunteers (for realistic friend networks)
  const friendPairs = [
    ["sarah.chen@gmail.com", "james.williams@hotmail.com"],
    ["priya.patel@yahoo.com", "maria.gonzalez@gmail.com"],
    ["vol1@example.com", "vol2@example.com"],
    ["vol3@example.com", "vol4@example.com"],
    ["vol6@example.com", "vol8@example.com"],
  ];

  for (const [email1, email2] of friendPairs) {
    const user1 = extraVolunteers.find(v => v.email === email1);
    const user2 = extraVolunteers.find(v => v.email === email2);
    
    if (user1 && user2) {
      try {
        // Create bidirectional friendship
        await prisma.friendship.create({
          data: {
            userId: user1.id,
            friendId: user2.id,
            status: "ACCEPTED",
            initiatedBy: user1.id,
            createdAt: subDays(new Date(), Math.floor(Math.random() * 120) + 30),
          },
        });

        await prisma.friendship.create({
          data: {
            userId: user2.id,
            friendId: user1.id,
            status: "ACCEPTED",
            initiatedBy: user1.id,
            createdAt: subDays(new Date(), Math.floor(Math.random() * 120) + 30),
          },
        });
      } catch (error) {
        // Skip if friendship already exists
        if (!error.message.includes('Unique constraint')) {
          throw error;
        }
      }
    }
  }

  // Set different privacy settings for some volunteers
  await prisma.user.update({
    where: { email: "sarah.chen@gmail.com" },
    data: { friendVisibility: "PUBLIC" },
  });

  await prisma.user.update({
    where: { email: "alex.taylor@gmail.com" },
    data: { friendVisibility: "PRIVATE" },
  });

  await prisma.user.update({
    where: { email: "vol10@example.com" },
    data: { allowFriendRequests: false },
  });

  console.log(`✅ Created ${existingFriends.length} friendships for sample volunteer`);
  console.log(`✅ Created ${pendingRequesters.length} pending friend requests`);
  console.log(`✅ Created ${sentRequestTargets.length} sent friend requests`);
  console.log(`✅ Created ${friendPairs.length} other volunteer friendships`);

  // Create updated shift types
  const dishwasher = await prisma.shiftType.upsert({
    where: { name: "Dishwasher" },
    update: {},
    create: {
      name: "Dishwasher",
      description: "Dishwashing and kitchen cleaning duties (5:30pm-9:00pm)",
    },
  });

  const fohSetup = await prisma.shiftType.upsert({
    where: { name: "FOH Set-Up & Service" },
    update: {},
    create: {
      name: "FOH Set-Up & Service",
      description: "Front of house setup and service support (4:30pm-9:00pm)",
    },
  });

  const frontOfHouse = await prisma.shiftType.upsert({
    where: { name: "Front of House" },
    update: {},
    create: {
      name: "Front of House",
      description: "Guest service and dining room support (5:30pm-9:00pm)",
    },
  });

  const kitchenPrep = await prisma.shiftType.upsert({
    where: { name: "Kitchen Prep" },
    update: {},
    create: {
      name: "Kitchen Prep",
      description: "Food preparation and ingredient prep (12:00pm-5:30pm)",
    },
  });

  const kitchenPrepService = await prisma.shiftType.upsert({
    where: { name: "Kitchen Prep & Service" },
    update: {},
    create: {
      name: "Kitchen Prep & Service",
      description: "Food prep and cooking service (12:00pm-9:00pm)",
    },
  });

  const kitchenServicePack = await prisma.shiftType.upsert({
    where: { name: "Kitchen Service & Pack Down" },
    update: {},
    create: {
      name: "Kitchen Service & Pack Down",
      description: "Cooking service and kitchen cleanup (5:30pm-9:00pm)",
    },
  });

  const mediaRole = await prisma.shiftType.upsert({
    where: { name: "Media Role" },
    update: {},
    create: {
      name: "Media Role",
      description: "Photography, social media content creation, and community engagement (5:00pm-7:00pm)",
    },
  });

  const today = new Date();

  // Define shift times and location-specific capacities
  const shiftConfigs = [
    {
      type: dishwasher,
      startHour: 17, // 5:30pm
      startMinute: 30,
      endHour: 21, // 9:00pm
      endMinute: 0,
      capacities: {
        "Wellington": 3, // 3 dishwasher
        "Glen Innes": 2, // 2 dishwasher
        "Onehunga": 2, // 2 dishwasher
      },
    },
    {
      type: fohSetup,
      startHour: 16, // 4:30pm
      startMinute: 30,
      endHour: 21, // 9:00pm
      endMinute: 0,
      capacities: {
        "Wellington": 2, // 2 front of house + setup
        "Glen Innes": 1, // 1 front of house + setup
        "Onehunga": 2, // 2 front of house + setup
      },
    },
    {
      type: frontOfHouse,
      startHour: 17, // 5:30pm
      startMinute: 30,
      endHour: 21, // 9:00pm
      endMinute: 0,
      capacities: {
        "Wellington": 8, // 8 front of house
        "Glen Innes": 8, // 8 front of house
        "Onehunga": 10, // 10 front of house
      },
    },
    {
      type: kitchenPrep,
      startHour: 12, // 12:00pm
      startMinute: 0,
      endHour: 17, // 5:30pm
      endMinute: 30,
      capacities: {
        "Wellington": 7, // 7 kitchen prep
        "Glen Innes": 5, // 5 kitchen prep
        "Onehunga": 6, // 6 kitchen prep
      },
    },
    {
      type: kitchenPrepService,
      startHour: 12, // 12:00pm
      startMinute: 0,
      endHour: 21, // 9:00pm
      endMinute: 0,
      capacities: {
        "Wellington": 6, // 6 kitchen service
        "Glen Innes": 4, // 4 kitchen service
        "Onehunga": 6, // 6 kitchen service
      },
    },
    {
      type: kitchenServicePack,
      startHour: 17, // 5:30pm
      startMinute: 30,
      endHour: 21, // 9:00pm
      endMinute: 0,
      capacities: {
        "Wellington": 6, // 6 kitchen service
        "Glen Innes": 4, // 4 kitchen service
        "Onehunga": 6, // 6 kitchen service
      },
    },
    {
      type: mediaRole,
      startHour: 17, // 5:00pm
      startMinute: 0,
      endHour: 19, // 7:00pm
      endMinute: 0,
      capacities: {
        "Wellington": 1, // 1 media role
        "Glen Innes": 1, // 1 media role
        "Onehunga": 1, // 1 media role
      },
    },
  ];

  const LOCATIONS = ["Wellington", "Glen Innes", "Onehunga"];
  const createdShifts = [];

  // Create historical shifts for the past 4 weeks to show volunteer history
  const historicalShifts = [];

  // Extended historical data - past 6 months for better achievement demonstration
  const extendedHistoricalPeriods = [
    // 6 months ago - started volunteering
    { weeksAgo: 24, shiftsPerWeek: 1 },
    { weeksAgo: 23, shiftsPerWeek: 1 },
    { weeksAgo: 22, shiftsPerWeek: 2 },
    { weeksAgo: 21, shiftsPerWeek: 1 },

    // 5 months ago - getting regular
    { weeksAgo: 20, shiftsPerWeek: 2 },
    { weeksAgo: 19, shiftsPerWeek: 2 },
    { weeksAgo: 18, shiftsPerWeek: 2 },
    { weeksAgo: 17, shiftsPerWeek: 3 },

    // 4 months ago - very active
    { weeksAgo: 16, shiftsPerWeek: 3 },
    { weeksAgo: 15, shiftsPerWeek: 2 },
    { weeksAgo: 14, shiftsPerWeek: 3 },
    { weeksAgo: 13, shiftsPerWeek: 2 },

    // 3 months ago - consistent volunteer
    { weeksAgo: 12, shiftsPerWeek: 2 },
    { weeksAgo: 11, shiftsPerWeek: 3 },
    { weeksAgo: 10, shiftsPerWeek: 2 },
    { weeksAgo: 9, shiftsPerWeek: 2 },

    // 2 months ago - experienced
    { weeksAgo: 8, shiftsPerWeek: 2 },
    { weeksAgo: 7, shiftsPerWeek: 3 },
    { weeksAgo: 6, shiftsPerWeek: 2 },
    { weeksAgo: 5, shiftsPerWeek: 2 },

    // Recent weeks
    { weeksAgo: 4, shiftsPerWeek: 2 },
    { weeksAgo: 3, shiftsPerWeek: 3 },
    { weeksAgo: 2, shiftsPerWeek: 2 },
    { weeksAgo: 1, shiftsPerWeek: 2 },
  ];

  // Create extended historical shifts
  for (const period of extendedHistoricalPeriods) {
    for (
      let shiftInWeek = 0;
      shiftInWeek < period.shiftsPerWeek;
      shiftInWeek++
    ) {
      // Vary the days - Monday, Wednesday, Friday pattern mostly
      const dayOffset = shiftInWeek === 0 ? 1 : shiftInWeek === 1 ? 3 : 5; // Mon, Wed, Fri
      const pastDate = addDays(today, -(period.weeksAgo * 7) + dayOffset);

      // Rotate through different shift types and locations for variety
      const shiftTypeIndex =
        (period.weeksAgo + shiftInWeek) % shiftConfigs.length;
      const locationIndex = (period.weeksAgo + shiftInWeek) % LOCATIONS.length;
      const config = shiftConfigs[shiftTypeIndex];
      const location = LOCATIONS[locationIndex];

      const start = set(pastDate, {
        hours: config.startHour,
        minutes: config.startMinute,
        seconds: 0,
        milliseconds: 0,
      });

      const end = set(pastDate, {
        hours: config.endHour,
        minutes: config.endMinute,
        seconds: 0,
        milliseconds: 0,
      });

      const historicalShift = await prisma.shift.create({
        data: {
          shiftTypeId: config.type.id,
          start,
          end,
          location,
          capacity: config.capacities[location],
          notes:
            period.weeksAgo === 1 && shiftInWeek === 0
              ? "Great teamwork this shift!"
              : period.weeksAgo > 20
              ? "Early volunteer shift"
              : null,
        },
      });

      historicalShifts.push(historicalShift);

      // Create signup for sample volunteer for historical shifts (respecting daily limit)
      if (canUserSignUpForDate(volunteer.id, historicalShift.start)) {
        await prisma.signup.create({
          data: {
            userId: volunteer.id,
            shiftId: historicalShift.id,
            status: "CONFIRMED",
            createdAt: addDays(start, -Math.floor(Math.random() * 7) - 1), // Signed up 1-7 days before
          },
        });
        recordUserSignup(volunteer.id, historicalShift.start);
      }

      // Also add some other volunteers to these shifts for realism
      const volunteersToAdd = Math.min(
        config.capacities[location] - 1, // Leave space for sample volunteer
        Math.floor(Math.random() * 3) + 1 // 1-3 other volunteers
      );

      for (let v = 0; v < volunteersToAdd; v++) {
        const volunteerIndex =
          (period.weeksAgo * 10 + shiftInWeek * 3 + v) % extraVolunteers.length;
        const otherVolunteer = extraVolunteers[volunteerIndex];

        // Check if this volunteer can sign up for this date
        if (canUserSignUpForDate(otherVolunteer.id, historicalShift.start)) {
          await prisma.signup.upsert({
            where: {
              userId_shiftId: {
                userId: otherVolunteer.id,
                shiftId: historicalShift.id,
              },
            },
            update: {},
            create: {
              userId: otherVolunteer.id,
              shiftId: historicalShift.id,
              status: "CONFIRMED",
            },
          });
          recordUserSignup(otherVolunteer.id, historicalShift.start);
        }
      }
    }
  }

  // Create shifts for the next 7 days
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i + 1);

    // Create shifts for each location and shift type
    for (
      let locationIndex = 0;
      locationIndex < LOCATIONS.length;
      locationIndex++
    ) {
      const location = LOCATIONS[locationIndex];

      for (
        let configIndex = 0;
        configIndex < shiftConfigs.length;
        configIndex++
      ) {
        const config = shiftConfigs[configIndex];

        const start = set(date, {
          hours: config.startHour,
          minutes: config.startMinute,
          seconds: 0,
          milliseconds: 0,
        });

        const end = set(date, {
          hours: config.endHour,
          minutes: config.endMinute,
          seconds: 0,
          milliseconds: 0,
        });

        const shift = await prisma.shift.create({
          data: {
            shiftTypeId: config.type.id,
            start,
            end,
            location,
            capacity: config.capacities[location],
            notes:
              i === 0 && configIndex === 0
                ? "Bring closed-toe shoes and apron"
                : null,
          },
        });
        createdShifts.push(shift);
      }
    }
  }

  // SKIP signing up sample volunteer for the first shift to demonstrate filtering
  // (This ensures at least the first day is completely free for testing)

  // Make some shifts full and add a waitlisted signup to demonstrate UI state
  // Also add friends to shifts to demonstrate social features
  let extraIndex = 0;
  
  // Get sample volunteer's friends for social seeding
  const sampleVolunteerFriends = [
    extraVolunteers.find(v => v.email === "sarah.chen@gmail.com"),
    extraVolunteers.find(v => v.email === "james.williams@hotmail.com"),
    extraVolunteers.find(v => v.email === "priya.patel@yahoo.com"),
  ].filter(Boolean);

  // Record existing historical signups to prevent conflicts
  console.log("📊 Recording existing signups to prevent daily conflicts...");
  const existingSignups = await prisma.signup.findMany({
    include: {
      shift: true,
    },
  });
  
  for (const signup of existingSignups) {
    recordUserSignup(signup.userId, signup.shift.start);
  }

  for (let i = 0; i < createdShifts.length; i++) {
    const s = createdShifts[i];
    
    // Every 4th shift: fill to capacity and add one waitlisted
    if (i % 4 === 0) {
      const capacity = s.capacity;
      // Create confirmed signups to fill the shift
      for (let c = 0; c < capacity; c++) {
        const user = extraVolunteers[(extraIndex + c) % extraVolunteers.length];
        
        // Check if user can sign up for this date
        if (canUserSignUpForDate(user.id, s.start)) {
          await prisma.signup.upsert({
            where: { userId_shiftId: { userId: user.id, shiftId: s.id } },
            update: { status: "CONFIRMED" },
            create: { userId: user.id, shiftId: s.id, status: "CONFIRMED" },
          });
          recordUserSignup(user.id, s.start);
        }
      }
      extraIndex = (extraIndex + capacity) % extraVolunteers.length;

      // Add one waitlisted person as well
      const waitlister = extraVolunteers[extraIndex % extraVolunteers.length];
      // Waitlisted users don't count towards daily limit since they're not confirmed
      await prisma.signup.upsert({
        where: { userId_shiftId: { userId: waitlister.id, shiftId: s.id } },
        update: { status: "WAITLISTED" },
        create: { userId: waitlister.id, shiftId: s.id, status: "WAITLISTED" },
      });
      extraIndex = (extraIndex + 1) % extraVolunteers.length;
    }
    
    // Add friends to shifts where sample volunteer is signed up (to show social activity)
    const shiftDay = s.start.getDate();
    const shouldSignUp = (shiftDay % 3 === 0) && (i % 10 === 0); // Match sample volunteer's condition
    
    if (shouldSignUp && sampleVolunteerFriends.length > 0) {
      // Add 1-2 friends to this shift to create social activity
      const friendsToAdd = Math.min(2, Math.floor(Math.random() * 2) + 1);
      
      for (let f = 0; f < friendsToAdd; f++) {
        const friend = sampleVolunteerFriends[f % sampleVolunteerFriends.length];
        
        // Check if friend can sign up for this date
        if (canUserSignUpForDate(friend.id, s.start)) {
          try {
            await prisma.signup.create({
              data: {
                userId: friend.id,
                shiftId: s.id,
                status: "CONFIRMED",
              },
            });
            recordUserSignup(friend.id, s.start);
            console.log(`✅ Signed up friend ${friend.email} for same shift as sample volunteer on ${s.start.toDateString()}`);
          } catch (error) {
            // Skip if signup already exists
            if (!error.message.includes('Unique constraint')) {
              console.log(`Could not add friend ${friend.email} to shift: ${error.message}`);
            }
          }
        }
      }
    }
    
    // Only sign up sample volunteer for very specific shifts to demonstrate filtering
    // This ensures most days are free, with only 2-3 days having signups
    // (shouldSignUp and shiftDay already declared above for friend signup logic)
    
    if (shouldSignUp) {
      // Check if sample volunteer can sign up for this date
      if (canUserSignUpForDate(volunteer.id, s.start)) {
        try {
          await prisma.signup.create({
            data: {
              userId: volunteer.id,
              shiftId: s.id,
              status: "CONFIRMED",
            },
          });
          recordUserSignup(volunteer.id, s.start);
          console.log(`✅ Signed up sample volunteer for ${s.start.toDateString()}`);
        } catch (error) {
          // Skip if signup already exists
          if (!error.message.includes('Unique constraint')) {
            console.log(`Could not add sample volunteer to shift: ${error.message}`);
          }
        }
      }
    }
  }

  // Seed notifications
  console.log("🔔 Seeding notifications...");
  try {
    // Get some users for creating realistic notifications
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, firstName: true, lastName: true, email: true },
    });

    const sampleUser = allUsers.find(u => u.email === 'volunteer@example.com');
    const adminUser = allUsers.find(u => u.email === 'admin@everybodyeats.nz');
    const otherUsers = allUsers.filter(u => u.email !== 'volunteer@example.com' && u.email !== 'admin@everybodyeats.nz');

    if (sampleUser && otherUsers.length > 0) {
      // Create a variety of notifications for the sample user
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const notifications = [
        // Recent friend request
        {
          userId: sampleUser.id,
          type: 'FRIEND_REQUEST_RECEIVED',
          title: 'New friend request',
          message: `${otherUsers[0].firstName || otherUsers[0].name || 'Someone'} sent you a friend request`,
          actionUrl: '/friends',
          relatedId: 'fake-friend-request-id',
          isRead: false,
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        // Shift confirmed notification
        {
          userId: sampleUser.id,
          type: 'SHIFT_CONFIRMED',
          title: 'Shift confirmed',
          message: 'Your Kitchen Prep shift on Saturday, August 24, 2025 has been confirmed',
          actionUrl: '/shifts/mine',
          relatedId: 'fake-shift-id',
          isRead: false,
          createdAt: oneDayAgo,
        },
        // Friend request accepted (older, read)
        {
          userId: sampleUser.id,
          type: 'FRIEND_REQUEST_ACCEPTED',
          title: 'Friend request accepted',
          message: `${otherUsers[1].firstName || otherUsers[1].name || 'Someone'} accepted your friend request`,
          actionUrl: '/friends',
          relatedId: 'fake-friendship-id',
          isRead: true,
          createdAt: twoDaysAgo,
        },
        // Waitlisted notification (older, read)
        {
          userId: sampleUser.id,
          type: 'SHIFT_WAITLISTED',
          title: 'Added to waitlist',
          message: "You've been added to the waitlist for Food Service on Sunday, August 18, 2025",
          actionUrl: '/shifts/mine',
          relatedId: 'fake-shift-id-2',
          isRead: true,
          createdAt: oneWeekAgo,
        },
        // Achievement unlocked (mix of read/unread)
        {
          userId: sampleUser.id,
          type: 'ACHIEVEMENT_UNLOCKED',
          title: 'Achievement unlocked!',
          message: 'Congratulations! You earned the "First Steps" achievement',
          actionUrl: '/dashboard',
          relatedId: 'fake-achievement-id',
          isRead: Math.random() > 0.5, // Randomly read or unread
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
      ];

      // Create notifications
      for (const notificationData of notifications) {
        await prisma.notification.create({
          data: notificationData,
        });
      }

      // Also create some notifications for other users so they have data too
      if (otherUsers.length >= 2) {
        const additionalNotifications = [
          {
            userId: otherUsers[0].id,
            type: 'FRIEND_REQUEST_RECEIVED',
            title: 'New friend request',
            message: `${sampleUser.firstName || sampleUser.name || 'Someone'} sent you a friend request`,
            actionUrl: '/friends',
            relatedId: 'fake-friend-request-id-2',
            isRead: false,
            createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          },
          {
            userId: otherUsers[1].id,
            type: 'SHIFT_CONFIRMED',
            title: 'Shift confirmed',
            message: 'Your Dishwashing shift on Friday, August 23, 2025 has been confirmed',
            actionUrl: '/shifts/mine',
            relatedId: 'fake-shift-id-3',
            isRead: true,
            createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
          },
        ];

        for (const notificationData of additionalNotifications) {
          await prisma.notification.create({
            data: notificationData,
          });
        }
      }

      console.log(`✅ Seeded ${notifications.length + (otherUsers.length >= 2 ? 2 : 0)} notifications`);
    } else {
      console.log("⚠️ Could not find required users for notification seeding");
    }
  } catch (error) {
    console.error("Warning: Could not seed notifications:", error.message);
  }

  // Seed achievements
  console.log("🎯 Seeding achievements...");
  try {
    // Define achievements directly here to avoid import issues
    const ACHIEVEMENT_DEFINITIONS = [
      // Milestone Achievements
      {
        name: "First Steps",
        description: "Complete your first volunteer shift",
        category: "MILESTONE",
        icon: "🌟",
        criteria: JSON.stringify({ type: "shifts_completed", value: 1 }),
        points: 10,
      },
      {
        name: "Getting Started",
        description: "Complete 5 volunteer shifts",
        category: "MILESTONE",
        icon: "⭐",
        criteria: JSON.stringify({ type: "shifts_completed", value: 5 }),
        points: 25,
      },
      {
        name: "Making a Difference",
        description: "Complete 10 volunteer shifts",
        category: "MILESTONE",
        icon: "🎯",
        criteria: JSON.stringify({ type: "shifts_completed", value: 10 }),
        points: 50,
      },
      {
        name: "Veteran Volunteer",
        description: "Complete 25 volunteer shifts",
        category: "MILESTONE",
        icon: "🏆",
        criteria: JSON.stringify({ type: "shifts_completed", value: 25 }),
        points: 100,
      },
      {
        name: "Community Champion",
        description: "Complete 50 volunteer shifts",
        category: "MILESTONE",
        icon: "👑",
        criteria: JSON.stringify({ type: "shifts_completed", value: 50 }),
        points: 200,
      },
      // Hour-based Achievements
      {
        name: "Time Keeper",
        description: "Volunteer for 10 hours",
        category: "DEDICATION",
        icon: "⏰",
        criteria: JSON.stringify({ type: "hours_volunteered", value: 10 }),
        points: 30,
      },
      {
        name: "Dedicated Helper",
        description: "Volunteer for 25 hours",
        category: "DEDICATION",
        icon: "💪",
        criteria: JSON.stringify({ type: "hours_volunteered", value: 25 }),
        points: 75,
      },
      {
        name: "Marathon Volunteer",
        description: "Volunteer for 50 hours",
        category: "DEDICATION",
        icon: "🏃",
        criteria: JSON.stringify({ type: "hours_volunteered", value: 50 }),
        points: 150,
      },
      {
        name: "Century Club",
        description: "Volunteer for 100 hours",
        category: "DEDICATION",
        icon: "💯",
        criteria: JSON.stringify({ type: "hours_volunteered", value: 100 }),
        points: 300,
      },
      // Consistency Achievements
      {
        name: "Consistent Helper",
        description: "Volunteer for 3 consecutive months",
        category: "DEDICATION",
        icon: "📅",
        criteria: JSON.stringify({ type: "consecutive_months", value: 3 }),
        points: 50,
      },
      {
        name: "Reliable Volunteer",
        description: "Volunteer for 6 consecutive months",
        category: "DEDICATION",
        icon: "🗓️",
        criteria: JSON.stringify({ type: "consecutive_months", value: 6 }),
        points: 100,
      },
      {
        name: "Year-Round Helper",
        description: "Volunteer for 12 consecutive months",
        category: "DEDICATION",
        icon: "🎊",
        criteria: JSON.stringify({ type: "consecutive_months", value: 12 }),
        points: 200,
      },
      // Anniversary Achievements
      {
        name: "One Year Strong",
        description: "Volunteer for one full year",
        category: "MILESTONE",
        icon: "🎂",
        criteria: JSON.stringify({ type: "years_volunteering", value: 1 }),
        points: 150,
      },
      {
        name: "Two Year Veteran",
        description: "Volunteer for two full years",
        category: "MILESTONE",
        icon: "🎉",
        criteria: JSON.stringify({ type: "years_volunteering", value: 2 }),
        points: 300,
      },
      // Community Impact
      {
        name: "Meal Master",
        description: "Help prepare an estimated 100 meals",
        category: "IMPACT",
        icon: "🍽️",
        criteria: JSON.stringify({ type: "community_impact", value: 100 }),
        points: 75,
      },
      {
        name: "Food Hero",
        description: "Help prepare an estimated 500 meals",
        category: "IMPACT",
        icon: "🦸",
        criteria: JSON.stringify({ type: "community_impact", value: 500 }),
        points: 200,
      },
      {
        name: "Hunger Fighter",
        description: "Help prepare an estimated 1000 meals",
        category: "IMPACT",
        icon: "⚔️",
        criteria: JSON.stringify({ type: "community_impact", value: 1000 }),
        points: 400,
      },
    ];

    // Create achievements
    for (const achievementDef of ACHIEVEMENT_DEFINITIONS) {
      await prisma.achievement.upsert({
        where: { name: achievementDef.name },
        update: {
          description: achievementDef.description,
          category: achievementDef.category,
          icon: achievementDef.icon,
          criteria: achievementDef.criteria,
          points: achievementDef.points,
          isActive: true,
        },
        create: {
          name: achievementDef.name,
          description: achievementDef.description,
          category: achievementDef.category,
          icon: achievementDef.icon,
          criteria: achievementDef.criteria,
          points: achievementDef.points,
          isActive: true,
        },
      });
    }
    console.log(`✅ Seeded ${ACHIEVEMENT_DEFINITIONS.length} achievements`);

    // Calculate sample volunteer's achievements
    const completedShifts = await prisma.signup.count({
      where: {
        userId: volunteer.id,
        status: "CONFIRMED",
        shift: { end: { lt: new Date() } },
      },
    });
    console.log(`📊 Sample volunteer has completed ${completedShifts} shifts`);
  } catch (error) {
    console.error("Warning: Could not seed achievements:", error.message);
  }

  // Seed auto-accept rules
  console.log("⚡ Seeding auto-accept rules...");
  try {
    // Get admin user for creating rules
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    });

    if (!adminUser) {
      console.log("⚠️ No admin user found, skipping auto-accept rules seeding");
    } else {
      const autoAcceptRules = [
        // Rule 1: Auto-approve experienced volunteers (YELLOW grade) with good attendance
        {
          name: "Experienced Volunteer Fast Track",
          description: "Automatically approve experienced volunteers (Yellow grade) with good attendance records",
          enabled: true,
          priority: 10,
          global: true, // Apply to all shift types
          shiftTypeId: null,
          minVolunteerGrade: "YELLOW",
          minCompletedShifts: 5,
          minAttendanceRate: 85.0,
          minAccountAgeDays: 30,
          maxDaysInAdvance: null,
          requireShiftTypeExperience: false,
          criteriaLogic: "AND",
          stopOnMatch: true,
          createdBy: adminUser.id,
        },
        
        // Rule 2: Auto-approve shift leaders (PINK grade) immediately
        {
          name: "Shift Leader Priority Access",
          description: "Automatically approve all shift leaders (Pink grade) - they have proven reliability",
          enabled: true,
          priority: 20, // Higher priority than experienced volunteers
          global: true,
          shiftTypeId: null,
          minVolunteerGrade: "PINK",
          minCompletedShifts: null,
          minAttendanceRate: null,
          minAccountAgeDays: null,
          maxDaysInAdvance: null,
          requireShiftTypeExperience: false,
          criteriaLogic: "AND",
          stopOnMatch: true,
          createdBy: adminUser.id,
        },

        // Rule 3: Auto-approve volunteers for Kitchen Prep shifts (easier entry point)
        {
          name: "Kitchen Prep Open Access",
          description: "Auto-approve any volunteer with basic experience for Kitchen Prep shifts",
          enabled: true,
          priority: 5, // Lower priority than grade-based rules
          global: false,
          shiftTypeId: kitchenPrep.id,
          minVolunteerGrade: "GREEN", // Even green volunteers
          minCompletedShifts: 2,
          minAttendanceRate: 75.0,
          minAccountAgeDays: 14,
          maxDaysInAdvance: null,
          requireShiftTypeExperience: false,
          criteriaLogic: "AND",
          stopOnMatch: false, // Allow other rules to also match
          createdBy: adminUser.id,
        },

        // Rule 4: Auto-approve for shifts happening soon (last-minute coverage)
        {
          name: "Last-Minute Coverage",
          description: "Auto-approve reliable volunteers for shifts starting within 3 days",
          enabled: true,
          priority: 15,
          global: true,
          shiftTypeId: null,
          minVolunteerGrade: "GREEN", // Any grade
          minCompletedShifts: 3,
          minAttendanceRate: 80.0,
          minAccountAgeDays: 21,
          maxDaysInAdvance: 3, // Only for shifts starting within 3 days
          requireShiftTypeExperience: false,
          criteriaLogic: "AND",
          stopOnMatch: true,
          createdBy: adminUser.id,
        },

        // Rule 5: Dishwasher experience required (specific skill rule)
        {
          name: "Dishwasher Veterans Only",
          description: "Auto-approve volunteers with dishwashing experience for dishwasher shifts",
          enabled: true,
          priority: 8,
          global: false,
          shiftTypeId: dishwasher.id,
          minVolunteerGrade: "GREEN",
          minCompletedShifts: 1,
          minAttendanceRate: null,
          minAccountAgeDays: 7,
          maxDaysInAdvance: null,
          requireShiftTypeExperience: true, // Must have done dishwashing before
          criteriaLogic: "AND",
          stopOnMatch: true,
          createdBy: adminUser.id,
        },

        // Rule 6: High-volume volunteers (OR logic example)
        {
          name: "Super Volunteer Express",
          description: "Auto-approve volunteers who are either very experienced OR have excellent attendance",
          enabled: true,
          priority: 12,
          global: true,
          shiftTypeId: null,
          minVolunteerGrade: "GREEN",
          minCompletedShifts: 15, // Either 15+ shifts
          minAttendanceRate: 95.0, // OR 95%+ attendance
          minAccountAgeDays: 60,
          maxDaysInAdvance: null,
          requireShiftTypeExperience: false,
          criteriaLogic: "OR", // Either condition can be true
          stopOnMatch: true,
          createdBy: adminUser.id,
        }
      ];

      // Create auto-accept rules
      for (const ruleData of autoAcceptRules) {
        await prisma.autoAcceptRule.create({
          data: ruleData,
        });
      }

      console.log(`✅ Seeded ${autoAcceptRules.length} auto-accept rules`);

      // Display volunteer grade distribution
      console.log("🎖️ Checking volunteer grade distribution...");
      
      const gradeStats = await prisma.user.groupBy({
        by: ['volunteerGrade'],
        where: { role: 'VOLUNTEER' },
        _count: { volunteerGrade: true },
      });
      
      for (const stat of gradeStats) {
        const gradeInfo = {
          GREEN: { emoji: '🟢', name: 'Standard' },
          YELLOW: { emoji: '🟡', name: 'Experienced' },
          PINK: { emoji: '🩷', name: 'Shift Leader' }
        };
        const info = gradeInfo[stat.volunteerGrade] || { emoji: '❓', name: 'Unknown' };
        console.log(`   ${info.emoji} ${stat.volunteerGrade} (${info.name}): ${stat._count.volunteerGrade} volunteers`);
      }

      // Optional: Promote some volunteers based on their extensive shift history if they need it
      console.log("🔄 Checking for any needed grade promotions based on shift history...");
      
      const userShiftCounts = await prisma.user.findMany({
        where: { role: "VOLUNTEER" },
        include: {
          signups: {
            where: {
              status: "CONFIRMED",
              shift: { end: { lt: new Date() } }, // Only completed shifts
            },
          },
        },
      });

      let promotions = 0;
      for (const user of userShiftCounts) {
        const shiftCount = user.signups.length;
        let recommendedGrade = "GREEN"; // Default
        
        if (shiftCount >= 25) {
          recommendedGrade = "PINK"; // Shift leader after 25 shifts
        } else if (shiftCount >= 10) {
          recommendedGrade = "YELLOW"; // Experienced after 10 shifts
        }
        
        // Only promote if they're below what their shift count suggests
        const gradePriority = { GREEN: 0, YELLOW: 1, PINK: 2 };
        const currentPriority = gradePriority[user.volunteerGrade];
        const recommendedPriority = gradePriority[recommendedGrade];
        
        if (currentPriority < recommendedPriority) {
          await prisma.user.update({
            where: { id: user.id },
            data: { volunteerGrade: recommendedGrade },
          });
          console.log(`   📈 Promoted ${user.email} from ${user.volunteerGrade} → ${recommendedGrade} (${shiftCount} completed shifts)`);
          promotions++;
        }
      }

      if (promotions === 0) {
        console.log("   ✅ All volunteer grades are appropriate for their experience level");
      } else {
        console.log(`   ✅ Applied ${promotions} promotions based on shift history`);
      }

      console.log("✅ Auto-accept rules seeding completed");
    }
  } catch (error) {
    console.error("Warning: Could not seed auto-accept rules:", error.message);
  }

  // Download and convert profile images after all users are created
  // Create shift templates for location-specific capacities
  console.log("📋 Seeding shift templates...");
  
  const templateConfigs = [
    // Wellington templates
    {
      name: "Wellington Kitchen Prep",
      location: "Wellington",
      shiftType: kitchenPrep,
      startTime: "12:00",
      endTime: "17:30",
      capacity: 7,
      notes: "Food preparation and ingredient prep",
    },
    {
      name: "Wellington Kitchen Service",
      location: "Wellington",
      shiftType: kitchenPrepService,
      startTime: "12:00",
      endTime: "21:00",
      capacity: 6,
      notes: "Food prep and cooking service",
    },
    {
      name: "Wellington Kitchen Service & Pack Down",
      location: "Wellington",
      shiftType: kitchenServicePack,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 6,
      notes: "Cooking service and kitchen cleanup",
    },
    {
      name: "Wellington Front of House",
      location: "Wellington",
      shiftType: frontOfHouse,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 8,
      notes: "Guest service and dining room support",
    },
    {
      name: "Wellington FOH Set-Up & Service",
      location: "Wellington",
      shiftType: fohSetup,
      startTime: "16:30",
      endTime: "21:00",
      capacity: 2,
      notes: "Front of house setup and service support",
    },
    {
      name: "Wellington Dishwasher",
      location: "Wellington",
      shiftType: dishwasher,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 3,
      notes: "Dishwashing and kitchen cleaning duties",
    },
    {
      name: "Wellington Media Role",
      location: "Wellington",
      shiftType: mediaRole,
      startTime: "17:00",
      endTime: "19:00",
      capacity: 1,
      notes: "Photography, social media content creation, and community engagement",
    },
    
    // Glen Innes templates
    {
      name: "Glen Innes Kitchen Prep",
      location: "Glen Innes",
      shiftType: kitchenPrep,
      startTime: "12:00",
      endTime: "17:30",
      capacity: 5,
      notes: "Food preparation and ingredient prep",
    },
    {
      name: "Glen Innes Kitchen Service",
      location: "Glen Innes",
      shiftType: kitchenPrepService,
      startTime: "12:00",
      endTime: "21:00",
      capacity: 4,
      notes: "Food prep and cooking service",
    },
    {
      name: "Glen Innes Kitchen Service & Pack Down",
      location: "Glen Innes",
      shiftType: kitchenServicePack,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 4,
      notes: "Cooking service and kitchen cleanup",
    },
    {
      name: "Glen Innes Front of House",
      location: "Glen Innes",
      shiftType: frontOfHouse,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 8,
      notes: "Guest service and dining room support",
    },
    {
      name: "Glen Innes FOH Set-Up & Service",
      location: "Glen Innes",
      shiftType: fohSetup,
      startTime: "16:30",
      endTime: "21:00",
      capacity: 1,
      notes: "Front of house setup and service support",
    },
    {
      name: "Glen Innes Dishwasher",
      location: "Glen Innes",
      shiftType: dishwasher,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 2,
      notes: "Dishwashing and kitchen cleaning duties",
    },
    {
      name: "Glen Innes Media Role",
      location: "Glen Innes",
      shiftType: mediaRole,
      startTime: "17:00",
      endTime: "19:00",
      capacity: 1,
      notes: "Photography, social media content creation, and community engagement",
    },
    
    // Onehunga templates
    {
      name: "Onehunga Kitchen Prep",
      location: "Onehunga",
      shiftType: kitchenPrep,
      startTime: "12:00",
      endTime: "17:30",
      capacity: 6,
      notes: "Food preparation and ingredient prep",
    },
    {
      name: "Onehunga Kitchen Service",
      location: "Onehunga",
      shiftType: kitchenPrepService,
      startTime: "12:00",
      endTime: "21:00",
      capacity: 6,
      notes: "Food prep and cooking service",
    },
    {
      name: "Onehunga Kitchen Service & Pack Down",
      location: "Onehunga",
      shiftType: kitchenServicePack,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 6,
      notes: "Cooking service and kitchen cleanup",
    },
    {
      name: "Onehunga Front of House",
      location: "Onehunga",
      shiftType: frontOfHouse,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 10,
      notes: "Guest service and dining room support",
    },
    {
      name: "Onehunga FOH Set-Up & Service",
      location: "Onehunga",
      shiftType: fohSetup,
      startTime: "16:30",
      endTime: "21:00",
      capacity: 2,
      notes: "Front of house setup and service support",
    },
    {
      name: "Onehunga Dishwasher",
      location: "Onehunga",
      shiftType: dishwasher,
      startTime: "17:30",
      endTime: "21:00",
      capacity: 2,
      notes: "Dishwashing and kitchen cleaning duties",
    },
    {
      name: "Onehunga Media Role",
      location: "Onehunga",
      shiftType: mediaRole,
      startTime: "17:00",
      endTime: "19:00",
      capacity: 1,
      notes: "Photography, social media content creation, and community engagement",
    },
  ];

  // Create shift templates
  for (const templateConfig of templateConfigs) {
    await prisma.shiftTemplate.upsert({
      where: {
        name_location: {
          name: templateConfig.name,
          location: templateConfig.location,
        },
      },
      update: {
        shiftTypeId: templateConfig.shiftType.id,
        startTime: templateConfig.startTime,
        endTime: templateConfig.endTime,
        capacity: templateConfig.capacity,
        notes: templateConfig.notes,
      },
      create: {
        name: templateConfig.name,
        location: templateConfig.location,
        shiftTypeId: templateConfig.shiftType.id,
        startTime: templateConfig.startTime,
        endTime: templateConfig.endTime,
        capacity: templateConfig.capacity,
        notes: templateConfig.notes,
      },
    });
  }

  console.log(`✅ Seeded ${templateConfigs.length} shift templates`);

  await downloadAndConvertProfileImages();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

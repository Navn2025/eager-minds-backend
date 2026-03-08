import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/index.js";
import bcrypt from "bcrypt";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@eagermindsclub.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@eagermindsclub.com",
      password: adminPassword,
      role: "admin",
      membershipStatus: "upgraded",
    },
  });
  console.log("Admin user created:", admin.email);

  // Create demo standard user
  const stdPassword = await bcrypt.hash("user123", 12);
  await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "user@example.com",
      password: stdPassword,
      role: "standard",
      membershipStatus: "standard",
    },
  });

  // Create demo premium user
  const premPassword = await bcrypt.hash("premium123", 12);
  await prisma.user.upsert({
    where: { email: "premium@example.com" },
    update: {},
    create: {
      name: "Premium User",
      email: "premium@example.com",
      password: premPassword,
      role: "premium",
      membershipStatus: "upgraded",
    },
  });

  // Create subjects
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { slug: "maths" },
      update: {},
      create: { name: "Maths", slug: "maths" },
    }),
    prisma.subject.upsert({
      where: { slug: "english" },
      update: {},
      create: { name: "English", slug: "english" },
    }),
    prisma.subject.upsert({
      where: { slug: "verbal-reasoning" },
      update: {},
      create: { name: "Verbal Reasoning", slug: "verbal-reasoning" },
    }),
    prisma.subject.upsert({
      where: { slug: "non-verbal-reasoning" },
      update: {},
      create: { name: "Non-Verbal Reasoning", slug: "non-verbal-reasoning" },
    }),
  ]);
  console.log("Subjects created:", subjects.map((s) => s.name).join(", "));

  // Create topics for each subject
  const mathsTopics = [
    "Algebra",
    "Geometry",
    "Fractions",
    "Percentages",
    "Number Patterns",
  ];
  const englishTopics = [
    "Comprehension",
    "Grammar",
    "Creative Writing",
    "Vocabulary",
    "Spelling",
  ];
  const vrTopics = [
    "Word Codes",
    "Letter Sequences",
    "Analogies",
    "Hidden Words",
    "Synonyms & Antonyms",
  ];
  const nvrTopics = [
    "Pattern Recognition",
    "Spatial Reasoning",
    "Matrices",
    "Sequences",
    "Reflections",
  ];

  const topicMap: Record<string, string[]> = {
    maths: mathsTopics,
    english: englishTopics,
    "verbal-reasoning": vrTopics,
    "non-verbal-reasoning": nvrTopics,
  };

  for (const subject of subjects) {
    const topicNames = topicMap[subject.slug] || [];
    for (const name of topicNames) {
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[&]/g, "and");
      await prisma.topic.upsert({
        where: { subjectId_slug: { subjectId: subject.id, slug } },
        update: {},
        create: { name, slug, subjectId: subject.id },
      });
    }
  }
  console.log("Topics created");

  // Create vocabulary words
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const words = [
    {
      word: "Ebullient",
      meaning: "Full of energy and enthusiasm",
      synonym: "Exuberant",
      antonym: "Lethargic",
      exampleSentence: "The ebullient children ran around the playground.",
      pronunciation: "ih-BUL-yuhnt",
    },
    {
      word: "Tenacious",
      meaning: "Holding firmly to something",
      synonym: "Persistent",
      antonym: "Yielding",
      exampleSentence: "She was tenacious in her pursuit of knowledge.",
      pronunciation: "tuh-NAY-shuhs",
    },
    {
      word: "Eloquent",
      meaning: "Fluent and persuasive in speaking or writing",
      synonym: "Articulate",
      antonym: "Inarticulate",
      exampleSentence: "The speaker gave an eloquent speech.",
      pronunciation: "EL-uh-kwuhnt",
    },
  ];

  for (let i = 0; i < words.length; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    await prisma.vocabularyWord.upsert({
      where: { date },
      update: {},
      create: { ...words[i], date },
    });
  }
  console.log("Vocabulary words created");

  // Create sample competitions
  await prisma.competition.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "Maths Challenge 2026",
        description: "Annual maths competition for Year 5 & 6 students.",
        rules: "Individual participation. 60 minutes. No calculators allowed.",
        eventDate: new Date("2026-04-15"),
      },
      {
        title: "Creative Writing Contest",
        description: "Write a short story on the theme 'Adventures in Time'.",
        rules: "Maximum 500 words. Original work only.",
        eventDate: new Date("2026-05-01"),
      },
    ],
  });
  console.log("Competitions created");

  // Create sample events
  await prisma.event.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "Saturday Workshop: Fractions Made Fun",
        description: "Interactive workshop on fractions for Year 4-6.",
        date: new Date("2026-03-22"),
        bookingLink: "https://forms.gle/example",
      },
      {
        title: "Easter Holiday Club",
        description:
          "Week-long holiday club with activities, crafts, and learning.",
        date: new Date("2026-04-07"),
      },
    ],
  });
  console.log("Events created");

  // Create sample blog posts
  await prisma.blogPost.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "How to Prepare for 11+ Exams",
        slug: "how-to-prepare-for-11-plus",
        content:
          "Preparing for 11+ exams requires a structured approach. Start early, practice regularly, and focus on understanding concepts rather than memorization...",
        excerpt: "Tips and strategies for effective 11+ exam preparation.",
        author: "Eager Minds Team",
        publishDate: new Date("2026-02-15"),
        status: "published",
      },
      {
        title: "The Importance of Creative Learning",
        slug: "importance-of-creative-learning",
        content:
          "Creative learning engages children in ways traditional teaching cannot. Through arts, crafts, and hands-on activities, children develop critical thinking...",
        excerpt: "Why creative learning matters for child development.",
        author: "Eager Minds Team",
        publishDate: new Date("2026-03-01"),
        status: "published",
      },
    ],
  });
  console.log("Blog posts created");

  // Create sample FAQs
  await prisma.fAQ.createMany({
    skipDuplicates: true,
    data: [
      {
        question: "What is Eager Minds Club?",
        answer:
          "Eager Minds Club is an educational platform for children preparing for 11+ exams, offering worksheets, activities, competitions, and more.",
        category: "membership",
        sortOrder: 1,
      },
      {
        question: "How much does membership cost?",
        answer:
          "We offer free standard membership with access to basic resources. Premium membership provides full access to all papers and resources.",
        category: "pricing",
        sortOrder: 1,
      },
      {
        question: "What are the class timings?",
        answer:
          "Our workshops and sessions are typically held on Saturdays from 10am to 12pm. Check the What's On page for specific dates.",
        category: "timings",
        sortOrder: 1,
      },
      {
        question: "I can't view a PDF. What should I do?",
        answer:
          "Make sure you're using a modern browser. PDFs are displayed in-browser for security. If issues persist, try clearing your browser cache.",
        category: "technical",
        sortOrder: 1,
      },
      {
        question: "Can I download worksheets?",
        answer:
          "For security reasons, worksheets and papers are view-only and cannot be downloaded or printed.",
        category: "resources",
        sortOrder: 1,
      },
    ],
  });
  console.log("FAQs created");

  // Create sample testimonials
  await prisma.testimonial.createMany({
    skipDuplicates: true,
    data: [
      {
        parentName: "Sarah M.",
        content:
          "My daughter loves the worksheets and activities. The 11+ prep resources have been incredibly helpful!",
        rating: 5,
      },
      {
        parentName: "James P.",
        content:
          "Great platform for learning. The competitions keep my son motivated and engaged.",
        rating: 5,
      },
    ],
  });
  console.log("Testimonials created");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

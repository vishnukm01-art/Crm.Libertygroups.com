import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Voice Jar demo data...");

  // Clean existing interactions
  await prisma.interactionListItem.deleteMany();
  await prisma.interactionList.deleteMany();
  await prisma.interactionMissedOpportunity.deleteMany();
  await prisma.interactionOutcome.deleteMany();
  await prisma.interactionStrength.deleteMany();
  await prisma.interactionWeakness.deleteMany();
  await prisma.interaction.deleteMany();

  // ─── Interaction 1: Billing Dispute ─────────────────────────────────────────
  const billing = await prisma.interaction.create({
    data: {
      type: "AUDIO",
      status: "COMPLETED",
      agentName: "Sarah Johnson",
      customerName: "Michael Chen",
      direction: "inbound",
      duration: 342,
      sentiment: "negative",
      score: 62,
      transcript:
        "Agent: Thank you for calling Liberty Markets support, my name is Sarah. How can I help you today?\n" +
        "Customer: Hi Sarah, I'm calling about a charge on my account that I don't recognize. There's a $50 fee showing up from yesterday.\n" +
        "Agent: I understand your concern, Michael. Let me pull up your account right away. Can you confirm your account number?\n" +
        "Customer: Yes, it's MT5-4892. I've been a customer for three years and I've never seen this charge before.\n" +
        "Agent: I can see the charge here. That appears to be an inactivity fee that was applied because there was no trading activity on your account for 90 days.\n" +
        "Customer: That's ridiculous! Nobody told me about this fee when I signed up. I was on vacation for two months, that's why I wasn't trading.\n" +
        "Agent: I completely understand your frustration. Let me check what I can do for you. Looking at your account history, I can see you've been an active trader prior to this period. As a one-time courtesy, I can reverse this charge for you.\n" +
        "Customer: Well, that would be great. But I want to make sure this doesn't happen again.\n" +
        "Agent: Absolutely. I've reversed the $50 charge and it should reflect in your account within 24 hours. For the future, I'd recommend setting up a small recurring trade or contacting us before extended periods of inactivity.\n" +
        "Customer: Okay, thank you Sarah. I appreciate you handling this quickly.",
      transcriptJson: [
        { start: 0, end: 8, text: "Thank you for calling Liberty Markets support, my name is Sarah. How can I help you today?" },
        { start: 8, end: 18, text: "Hi Sarah, I'm calling about a charge on my account that I don't recognize. There's a $50 fee showing up from yesterday." },
        { start: 18, end: 30, text: "I understand your concern, Michael. Let me pull up your account right away. Can you confirm your account number?" },
        { start: 30, end: 40, text: "Yes, it's MT5-4892. I've been a customer for three years and I've never seen this charge before." },
        { start: 40, end: 55, text: "I can see the charge here. That appears to be an inactivity fee that was applied because there was no trading activity on your account for 90 days." },
        { start: 55, end: 68, text: "That's ridiculous! Nobody told me about this fee when I signed up. I was on vacation for two months, that's why I wasn't trading." },
        { start: 68, end: 95, text: "I completely understand your frustration. Let me check what I can do for you. Looking at your account history, I can see you've been an active trader prior to this period. As a one-time courtesy, I can reverse this charge for you." },
        { start: 95, end: 105, text: "Well, that would be great. But I want to make sure this doesn't happen again." },
        { start: 105, end: 130, text: "Absolutely. I've reversed the $50 charge and it should reflect in your account within 24 hours. For the future, I'd recommend setting up a small recurring trade or contacting us before extended periods of inactivity." },
        { start: 130, end: 140, text: "Okay, thank you Sarah. I appreciate you handling this quickly." },
      ],
      summaryJson: {
        overview: "Customer called about an unrecognized $50 inactivity fee. Agent identified the charge, empathized with the customer, and reversed the fee as a one-time courtesy.",
        keyPoints: [
          "Customer disputed a $50 inactivity fee on MT5 account",
          "Fee was triggered by 90 days of no trading activity",
          "Agent reversed the charge as a courtesy for loyal customer",
          "Customer was advised on preventing future inactivity fees",
        ],
        actionItems: [
          "Verify $50 refund processes within 24 hours",
          "Review inactivity fee disclosure in signup process",
        ],
        customerSentiment: "Initially frustrated and confrontational, but calmed down after agent offered a resolution. Left the call satisfied.",
        agentPerformance: "Good empathy and quick resolution. Could have been more proactive about explaining the fee policy upfront.",
      },
    },
  });

  await prisma.interactionOutcome.createMany({
    data: [
      {
        interactionId: billing.id,
        name: "Fee Reversed",
        description: "The $50 inactivity fee was successfully reversed as a one-time courtesy.",
        timeReferences: [{ startTime: 68, endTime: 95, label: "01:08-01:35" }],
      },
      {
        interactionId: billing.id,
        name: "Customer Retained",
        description: "Long-term customer was retained by addressing their billing concern promptly.",
        timeReferences: [{ startTime: 130, endTime: 140, label: "02:10-02:20" }],
      },
    ],
  });

  await prisma.interactionStrength.createMany({
    data: [
      {
        interactionId: billing.id,
        name: "Quick Empathy",
        description: "Agent immediately acknowledged the customer's frustration and validated their concern.",
        timeReferences: [{ startTime: 18, endTime: 30, label: "00:18-00:30" }],
      },
      {
        interactionId: billing.id,
        name: "Proactive Resolution",
        description: "Agent took initiative to check account history and offer a reversal without requiring escalation.",
        timeReferences: [{ startTime: 68, endTime: 95, label: "01:08-01:35" }],
      },
      {
        interactionId: billing.id,
        name: "Prevention Guidance",
        description: "Provided actionable advice on how to avoid the fee in the future.",
        timeReferences: [{ startTime: 105, endTime: 130, label: "01:45-02:10" }],
      },
    ],
  });

  await prisma.interactionWeakness.createMany({
    data: [
      {
        interactionId: billing.id,
        name: "No Upfront Fee Explanation",
        description: "Agent didn't proactively explain what the inactivity fee policy entails before the customer had to express frustration.",
        timeReferences: [{ startTime: 40, endTime: 55, label: "00:40-00:55" }],
      },
      {
        interactionId: billing.id,
        name: "Missed Loyalty Acknowledgment",
        description: "Did not explicitly acknowledge the customer's 3-year loyalty as a reason for the reversal.",
        timeReferences: [{ startTime: 30, endTime: 40, label: "00:30-00:40" }],
      },
    ],
  });

  await prisma.interactionMissedOpportunity.createMany({
    data: [
      {
        interactionId: billing.id,
        name: "Upsell Premium Account",
        description: "Customer is a 3-year loyal trader. Could have mentioned premium account benefits that include waived inactivity fees.",
        timeReferences: [{ startTime: 105, endTime: 130, label: "01:45-02:10" }],
      },
      {
        interactionId: billing.id,
        name: "Set Up Activity Alerts",
        description: "Could have offered to set up email alerts before the inactivity threshold is reached.",
        timeReferences: [{ startTime: 105, endTime: 130, label: "01:45-02:10" }],
      },
    ],
  });

  // ─── Interaction 2: Premium Plan Upgrade ────────────────────────────────────
  const upgrade = await prisma.interaction.create({
    data: {
      type: "AUDIO",
      status: "COMPLETED",
      agentName: "James Wilson",
      customerName: "Emily Rodriguez",
      direction: "outbound",
      duration: 480,
      sentiment: "positive",
      score: 88,
      transcript:
        "Agent: Hi Emily, this is James from Liberty Markets. I'm calling to follow up on your recent inquiry about our premium trading plans.\n" +
        "Customer: Oh hi James, yes I was looking at the Gold plan on your website. Can you tell me more about it?\n" +
        "Agent: Absolutely! The Gold plan includes tighter spreads starting from 0.1 pips, priority customer support, and access to our advanced charting tools. Based on your trading volume over the past six months, you'd actually save about $200 per month in spread costs alone.\n" +
        "Customer: That sounds interesting. What about the leverage? I currently have 1:100.\n" +
        "Agent: Great question. With Gold, you can access leverage up to 1:200, though I always recommend considering your risk tolerance. We also provide free risk management consultations.\n" +
        "Customer: And what's the monthly cost?\n" +
        "Agent: The Gold plan is $49 per month, but given your trading volume, the spread savings far outweigh the cost. Plus, I can offer you a 30-day free trial to see the difference firsthand.\n" +
        "Customer: A free trial sounds great! Let's do that.\n" +
        "Agent: Wonderful! I'll set that up right now. You'll receive a confirmation email within the next hour.",
      transcriptJson: [
        { start: 0, end: 12, text: "Hi Emily, this is James from Liberty Markets. I'm calling to follow up on your recent inquiry about our premium trading plans." },
        { start: 12, end: 22, text: "Oh hi James, yes I was looking at the Gold plan on your website. Can you tell me more about it?" },
        { start: 22, end: 50, text: "Absolutely! The Gold plan includes tighter spreads starting from 0.1 pips, priority customer support, and access to our advanced charting tools. Based on your trading volume over the past six months, you'd actually save about $200 per month in spread costs alone." },
        { start: 50, end: 60, text: "That sounds interesting. What about the leverage? I currently have 1:100." },
        { start: 60, end: 80, text: "Great question. With Gold, you can access leverage up to 1:200, though I always recommend considering your risk tolerance. We also provide free risk management consultations." },
        { start: 80, end: 88, text: "And what's the monthly cost?" },
        { start: 88, end: 115, text: "The Gold plan is $49 per month, but given your trading volume, the spread savings far outweigh the cost. Plus, I can offer you a 30-day free trial to see the difference firsthand." },
        { start: 115, end: 122, text: "A free trial sounds great! Let's do that." },
        { start: 122, end: 135, text: "Wonderful! I'll set that up right now. You'll receive a confirmation email within the next hour." },
      ],
      summaryJson: {
        overview: "Outbound follow-up call for premium plan inquiry. Customer was successfully converted to a Gold plan 30-day free trial through personalized value demonstration.",
        keyPoints: [
          "Customer inquired about Gold trading plan",
          "Agent personalized the pitch using customer's trading volume data",
          "Spread savings of ~$200/month highlighted as key benefit",
          "30-day free trial offered and accepted",
        ],
        actionItems: [
          "Send confirmation email for Gold plan trial activation",
          "Schedule follow-up call for day 25 of trial",
          "Set reminder to check customer's trial experience at day 14",
        ],
        customerSentiment: "Interested and receptive from the start. Became enthusiastic after hearing about the cost savings and free trial.",
        agentPerformance: "Excellent personalized approach. Used data-driven arguments and offered risk-free trial to close.",
      },
    },
  });

  await prisma.interactionOutcome.createMany({
    data: [
      {
        interactionId: upgrade.id,
        name: "Trial Conversion",
        description: "Customer agreed to a 30-day Gold plan free trial.",
        timeReferences: [{ startTime: 115, endTime: 122, label: "01:55-02:02" }],
      },
      {
        interactionId: upgrade.id,
        name: "Value Demonstrated",
        description: "Successfully communicated $200/month savings based on customer's actual trading volume.",
        timeReferences: [{ startTime: 22, endTime: 50, label: "00:22-00:50" }],
      },
    ],
  });

  await prisma.interactionStrength.createMany({
    data: [
      {
        interactionId: upgrade.id,
        name: "Data-Driven Personalization",
        description: "Used customer's actual 6-month trading volume to quantify the specific savings amount.",
        timeReferences: [{ startTime: 22, endTime: 50, label: "00:22-00:50" }],
      },
      {
        interactionId: upgrade.id,
        name: "Risk-Free Offer",
        description: "Offered 30-day free trial which removed purchase anxiety and facilitated the conversion.",
        timeReferences: [{ startTime: 88, endTime: 115, label: "01:28-01:55" }],
      },
      {
        interactionId: upgrade.id,
        name: "Responsible Leverage Guidance",
        description: "Mentioned risk tolerance when discussing higher leverage, demonstrating responsible selling.",
        timeReferences: [{ startTime: 60, endTime: 80, label: "01:00-01:20" }],
      },
    ],
  });

  await prisma.interactionWeakness.createMany({
    data: [
      {
        interactionId: upgrade.id,
        name: "No Comparison with Other Plans",
        description: "Did not present Silver or Platinum options to help the customer make an informed choice.",
        timeReferences: [{ startTime: 22, endTime: 50, label: "00:22-00:50" }],
      },
    ],
  });

  await prisma.interactionMissedOpportunity.createMany({
    data: [
      {
        interactionId: upgrade.id,
        name: "Referral Program Mention",
        description: "Could have mentioned the referral program to encourage the customer to bring other traders.",
        timeReferences: [{ startTime: 122, endTime: 135, label: "02:02-02:15" }],
      },
      {
        interactionId: upgrade.id,
        name: "Educational Resources",
        description: "Missed opportunity to mention premium webinars and trading courses included with the Gold plan.",
        timeReferences: [{ startTime: 60, endTime: 80, label: "01:00-01:20" }],
      },
    ],
  });

  // ─── Interaction 3: Service Outage Report ───────────────────────────────────
  const outage = await prisma.interaction.create({
    data: {
      type: "AUDIO",
      status: "COMPLETED",
      agentName: "David Park",
      customerName: "Robert Thompson",
      direction: "inbound",
      duration: 195,
      sentiment: "negative",
      score: 45,
      transcript:
        "Agent: Liberty Markets support, David speaking.\n" +
        "Customer: I can't access my trading platform! I've been trying for the past 30 minutes and I have open positions that need management!\n" +
        "Agent: I apologize for the inconvenience. Let me check the system status.\n" +
        "Customer: This is unacceptable! I could be losing money right now!\n" +
        "Agent: I understand your urgency, sir. We are currently experiencing a brief technical issue with our MT5 servers. Our engineering team is actively working on it.\n" +
        "Customer: When will it be fixed? I need an exact time!\n" +
        "Agent: I'm unable to provide an exact time, but based on the progress, we expect resolution within the next 15-20 minutes. Your positions are safe and stop-losses remain active during the outage.\n" +
        "Customer: Fine. But I want compensation for this downtime.\n" +
        "Agent: I completely understand. Once service is restored, please contact us and we'll review your account for any impact.",
      transcriptJson: [
        { start: 0, end: 5, text: "Liberty Markets support, David speaking." },
        { start: 5, end: 18, text: "I can't access my trading platform! I've been trying for the past 30 minutes and I have open positions that need management!" },
        { start: 18, end: 28, text: "I apologize for the inconvenience. Let me check the system status." },
        { start: 28, end: 35, text: "This is unacceptable! I could be losing money right now!" },
        { start: 35, end: 55, text: "I understand your urgency, sir. We are currently experiencing a brief technical issue with our MT5 servers. Our engineering team is actively working on it." },
        { start: 55, end: 62, text: "When will it be fixed? I need an exact time!" },
        { start: 62, end: 85, text: "I'm unable to provide an exact time, but based on the progress, we expect resolution within the next 15-20 minutes. Your positions are safe and stop-losses remain active during the outage." },
        { start: 85, end: 92, text: "Fine. But I want compensation for this downtime." },
        { start: 92, end: 110, text: "I completely understand. Once service is restored, please contact us and we'll review your account for any impact." },
      ],
      summaryJson: {
        overview: "Customer reported inability to access MT5 trading platform during service outage. Agent confirmed the issue, provided estimated resolution time, but failed to offer immediate concrete solutions.",
        keyPoints: [
          "MT5 platform outage affecting multiple users",
          "Customer had open positions at risk",
          "Estimated 15-20 minute resolution provided",
          "Customer requested compensation for downtime",
        ],
        actionItems: [
          "Follow up with customer after service restoration",
          "Review account for outage impact and process compensation",
          "Document incident for post-mortem",
        ],
        customerSentiment: "Highly agitated and anxious about financial exposure. Not fully reassured by the end of the call.",
        agentPerformance: "Adequate crisis communication but lacked proactivity in offering immediate solutions or compensation.",
      },
    },
  });

  await prisma.interactionOutcome.createMany({
    data: [
      {
        interactionId: outage.id,
        name: "Issue Acknowledged",
        description: "Agent confirmed the service outage and provided an estimated resolution timeline.",
        timeReferences: [{ startTime: 35, endTime: 55, label: "00:35-00:55" }],
      },
    ],
  });

  await prisma.interactionStrength.createMany({
    data: [
      {
        interactionId: outage.id,
        name: "Stop-Loss Reassurance",
        description: "Informed customer that stop-losses remain active during the outage, addressing their primary financial concern.",
        timeReferences: [{ startTime: 62, endTime: 85, label: "01:02-01:25" }],
      },
    ],
  });

  await prisma.interactionWeakness.createMany({
    data: [
      {
        interactionId: outage.id,
        name: "Slow System Check",
        description: "Agent should have already known about the outage instead of needing to check system status.",
        timeReferences: [{ startTime: 18, endTime: 28, label: "00:18-00:28" }],
      },
      {
        interactionId: outage.id,
        name: "No Proactive Compensation",
        description: "When customer requested compensation, agent deferred instead of offering something immediately.",
        timeReferences: [{ startTime: 85, endTime: 110, label: "01:25-01:50" }],
      },
      {
        interactionId: outage.id,
        name: "Vague Resolution Time",
        description: "Could not provide a definitive resolution time, which increased customer anxiety.",
        timeReferences: [{ startTime: 55, endTime: 85, label: "00:55-01:25" }],
      },
    ],
  });

  await prisma.interactionMissedOpportunity.createMany({
    data: [
      {
        interactionId: outage.id,
        name: "Offer Immediate Credit",
        description: "Should have offered an immediate courtesy credit or fee waiver to demonstrate goodwill during the outage.",
        timeReferences: [{ startTime: 85, endTime: 110, label: "01:25-01:50" }],
      },
      {
        interactionId: outage.id,
        name: "Provide Alternative Access",
        description: "Could have offered web terminal or mobile app as alternative access methods during the MT5 outage.",
        timeReferences: [{ startTime: 35, endTime: 55, label: "00:35-00:55" }],
      },
      {
        interactionId: outage.id,
        name: "Proactive Callback Offer",
        description: "Should have offered to call back once service was restored instead of asking customer to contact again.",
        timeReferences: [{ startTime: 92, endTime: 110, label: "01:32-01:50" }],
      },
    ],
  });

  // ─── Interaction 4: App Login Failure ───────────────────────────────────────
  const login = await prisma.interaction.create({
    data: {
      type: "AUDIO",
      status: "COMPLETED",
      agentName: "Lisa Martinez",
      customerName: "Ahmed Al-Rashid",
      direction: "inbound",
      duration: 260,
      sentiment: "neutral",
      score: 75,
      transcript:
        "Agent: Thank you for calling Liberty Markets, this is Lisa. How may I assist you?\n" +
        "Customer: Hello Lisa, I'm having trouble logging into my MT5 account on the mobile app. It keeps saying invalid credentials.\n" +
        "Agent: I'm sorry to hear that, Ahmed. Let me help you troubleshoot this. Have you recently changed your password?\n" +
        "Customer: No, I haven't changed anything. It was working fine yesterday.\n" +
        "Agent: Okay, let me verify your account. Can you confirm your email address?\n" +
        "Customer: It's ahmed.rashid@email.com.\n" +
        "Agent: Thank you. I can see your account is active. It appears your password may have expired as part of our quarterly security rotation. I'll send you a password reset link right now.\n" +
        "Customer: Oh, I didn't know about the security rotation. That would have been nice to know in advance.\n" +
        "Agent: You're absolutely right, and I apologize for that. The reset link has been sent to your email. Please set a new password and try logging in again.\n" +
        "Customer: Got it, I see the email. Let me try... Yes, it's working now. Thank you Lisa.\n" +
        "Agent: You're welcome, Ahmed. Is there anything else I can help you with today?",
      transcriptJson: [
        { start: 0, end: 8, text: "Thank you for calling Liberty Markets, this is Lisa. How may I assist you?" },
        { start: 8, end: 20, text: "Hello Lisa, I'm having trouble logging into my MT5 account on the mobile app. It keeps saying invalid credentials." },
        { start: 20, end: 32, text: "I'm sorry to hear that, Ahmed. Let me help you troubleshoot this. Have you recently changed your password?" },
        { start: 32, end: 40, text: "No, I haven't changed anything. It was working fine yesterday." },
        { start: 40, end: 50, text: "Okay, let me verify your account. Can you confirm your email address?" },
        { start: 50, end: 55, text: "It's ahmed.rashid@email.com." },
        { start: 55, end: 75, text: "Thank you. I can see your account is active. It appears your password may have expired as part of our quarterly security rotation. I'll send you a password reset link right now." },
        { start: 75, end: 88, text: "Oh, I didn't know about the security rotation. That would have been nice to know in advance." },
        { start: 88, end: 105, text: "You're absolutely right, and I apologize for that. The reset link has been sent to your email. Please set a new password and try logging in again." },
        { start: 105, end: 118, text: "Got it, I see the email. Let me try... Yes, it's working now. Thank you Lisa." },
        { start: 118, end: 125, text: "You're welcome, Ahmed. Is there anything else I can help you with today?" },
      ],
      summaryJson: {
        overview: "Customer was unable to log in due to expired password from quarterly security rotation. Issue resolved by sending password reset link. Customer noted lack of advance notification.",
        keyPoints: [
          "MT5 mobile app login failure due to expired password",
          "Quarterly security rotation caused the password expiry",
          "Password reset link sent and customer regained access",
          "Customer noted the lack of advance notification about the rotation",
        ],
        actionItems: [
          "Recommend product team implement advance notification emails for password rotations",
          "Update FAQ with information about quarterly security rotations",
        ],
        customerSentiment: "Mildly frustrated about the lack of communication but satisfied with the quick resolution.",
        agentPerformance: "Efficient troubleshooting and resolution. Appropriately acknowledged the communication gap.",
      },
    },
  });

  await prisma.interactionOutcome.createMany({
    data: [
      {
        interactionId: login.id,
        name: "Login Restored",
        description: "Customer successfully logged back into their MT5 mobile app after password reset.",
        timeReferences: [{ startTime: 105, endTime: 118, label: "01:45-01:58" }],
      },
    ],
  });

  await prisma.interactionStrength.createMany({
    data: [
      {
        interactionId: login.id,
        name: "Efficient Diagnosis",
        description: "Quickly identified the root cause as quarterly password rotation without unnecessary troubleshooting steps.",
        timeReferences: [{ startTime: 55, endTime: 75, label: "00:55-01:15" }],
      },
      {
        interactionId: login.id,
        name: "Acknowledged Communication Gap",
        description: "Agreed with customer that advance notification should have been provided, validating their feedback.",
        timeReferences: [{ startTime: 88, endTime: 105, label: "01:28-01:45" }],
      },
    ],
  });

  await prisma.interactionWeakness.createMany({
    data: [
      {
        interactionId: login.id,
        name: "No Escalation of Feedback",
        description: "Customer's feedback about missing notifications should have been formally captured as a product improvement request.",
        timeReferences: [{ startTime: 75, endTime: 88, label: "01:15-01:28" }],
      },
    ],
  });

  await prisma.interactionMissedOpportunity.createMany({
    data: [
      {
        interactionId: login.id,
        name: "Enable 2FA",
        description: "Could have used this moment to recommend enabling two-factor authentication for enhanced security.",
        timeReferences: [{ startTime: 88, endTime: 105, label: "01:28-01:45" }],
      },
    ],
  });

  // ─── Interaction 5: API Integration Help ────────────────────────────────────
  const api = await prisma.interaction.create({
    data: {
      type: "AUDIO",
      status: "COMPLETED",
      agentName: "Tom Anderson",
      customerName: "Sophia Patel",
      direction: "inbound",
      duration: 520,
      sentiment: "positive",
      score: 82,
      transcript:
        "Agent: Liberty Markets tech support, Tom speaking. How can I help?\n" +
        "Customer: Hi Tom, I'm trying to set up API access for automated trading on my account. I've been reading the docs but I'm stuck on authentication.\n" +
        "Agent: Sure, I can help with that. Are you using our REST API or the WebSocket API?\n" +
        "Customer: REST API. I have my API key but I keep getting 401 errors when I try to make requests.\n" +
        "Agent: That's a common issue. The API key needs to be passed in the Authorization header as a Bearer token. Are you including the 'Bearer' prefix before your key?\n" +
        "Customer: Oh! No, I was just passing the key directly. Let me try with the Bearer prefix... It works! Thank you so much.\n" +
        "Agent: You're welcome! One more tip - make sure to also include the X-Account-ID header for any trading operations. And I'd recommend starting with the sandbox environment to test your automated strategies safely.\n" +
        "Customer: That's really helpful, I didn't know about the sandbox. How do I access it?\n" +
        "Agent: I'll send you the sandbox endpoint and documentation link right after this call. You'll use the same API key but with the sandbox base URL.",
      transcriptJson: [
        { start: 0, end: 7, text: "Liberty Markets tech support, Tom speaking. How can I help?" },
        { start: 7, end: 22, text: "Hi Tom, I'm trying to set up API access for automated trading on my account. I've been reading the docs but I'm stuck on authentication." },
        { start: 22, end: 32, text: "Sure, I can help with that. Are you using our REST API or the WebSocket API?" },
        { start: 32, end: 45, text: "REST API. I have my API key but I keep getting 401 errors when I try to make requests." },
        { start: 45, end: 62, text: "That's a common issue. The API key needs to be passed in the Authorization header as a Bearer token. Are you including the 'Bearer' prefix before your key?" },
        { start: 62, end: 80, text: "Oh! No, I was just passing the key directly. Let me try with the Bearer prefix... It works! Thank you so much." },
        { start: 80, end: 110, text: "You're welcome! One more tip - make sure to also include the X-Account-ID header for any trading operations. And I'd recommend starting with the sandbox environment to test your automated strategies safely." },
        { start: 110, end: 120, text: "That's really helpful, I didn't know about the sandbox. How do I access it?" },
        { start: 120, end: 140, text: "I'll send you the sandbox endpoint and documentation link right after this call. You'll use the same API key but with the sandbox base URL." },
      ],
      summaryJson: {
        overview: "Technical support call for API integration. Customer had authentication issues (missing Bearer prefix). Agent resolved quickly and provided additional guidance about sandbox environment and headers.",
        keyPoints: [
          "Customer setting up REST API for automated trading",
          "401 error caused by missing 'Bearer' prefix in Authorization header",
          "Additional guidance provided on X-Account-ID header requirement",
          "Sandbox environment recommended for testing",
        ],
        actionItems: [
          "Send sandbox endpoint URL and documentation to customer",
          "Flag auth documentation for improvement (Bearer prefix should be more prominent)",
        ],
        customerSentiment: "Eager to learn and appreciative of the guidance. Very satisfied with the level of technical detail provided.",
        agentPerformance: "Excellent technical knowledge. Went above and beyond by providing proactive tips beyond the initial question.",
      },
    },
  });

  await prisma.interactionOutcome.createMany({
    data: [
      {
        interactionId: api.id,
        name: "Auth Issue Resolved",
        description: "Customer successfully authenticated API calls after adding Bearer prefix.",
        timeReferences: [{ startTime: 62, endTime: 80, label: "01:02-01:20" }],
      },
      {
        interactionId: api.id,
        name: "Sandbox Guidance Provided",
        description: "Customer introduced to sandbox environment for safe testing of automated strategies.",
        timeReferences: [{ startTime: 80, endTime: 110, label: "01:20-01:50" }],
      },
    ],
  });

  await prisma.interactionStrength.createMany({
    data: [
      {
        interactionId: api.id,
        name: "Quick Diagnosis",
        description: "Immediately identified the common Bearer token issue without requiring extensive debugging.",
        timeReferences: [{ startTime: 45, endTime: 62, label: "00:45-01:02" }],
      },
      {
        interactionId: api.id,
        name: "Proactive Extra Guidance",
        description: "Volunteered information about X-Account-ID header and sandbox environment beyond the original question.",
        timeReferences: [{ startTime: 80, endTime: 110, label: "01:20-01:50" }],
      },
    ],
  });

  await prisma.interactionWeakness.createMany({
    data: [
      {
        interactionId: api.id,
        name: "No Rate Limit Warning",
        description: "Did not mention API rate limits, which is critical for automated trading systems.",
        timeReferences: [{ startTime: 80, endTime: 110, label: "01:20-01:50" }],
      },
    ],
  });

  await prisma.interactionMissedOpportunity.createMany({
    data: [
      {
        interactionId: api.id,
        name: "WebSocket API Suggestion",
        description: "For real-time automated trading, WebSocket API would be more efficient. Could have mentioned this as a next step.",
        timeReferences: [{ startTime: 22, endTime: 32, label: "00:22-00:32" }],
      },
      {
        interactionId: api.id,
        name: "Dedicated Account Manager",
        description: "Customer setting up automated trading likely has significant volume. Could have offered dedicated account manager support.",
        timeReferences: [{ startTime: 120, endTime: 140, label: "02:00-02:20" }],
      },
    ],
  });

  // ─── Managed Lists ──────────────────────────────────────────────────────────

  const listNotFollowedSOP = await prisma.interactionList.create({
    data: { name: "Not followed SOP", description: "Agents who did not follow standard operating procedures during calls", visibility: "PERSONAL" },
  });

  const listFoulLanguage = await prisma.interactionList.create({
    data: { name: "Foul language", description: "Interactions where inappropriate language was detected", visibility: "PERSONAL" },
  });

  const listNoGreeting = await prisma.interactionList.create({
    data: { name: "No greetings in opening", description: "Calls where the agent failed to greet the customer properly", visibility: "PERSONAL" },
  });

  const listNotPatient = await prisma.interactionList.create({
    data: { name: "Not patient on the call", description: "Agents who showed impatience during customer interactions", visibility: "PERSONAL" },
  });

  const listNotShownEmpathy = await prisma.interactionList.create({
    data: { name: "Not shown empathy", description: "Calls where the agent failed to show empathy towards the customer", visibility: "PERSONAL" },
  });

  const listNotDescribedProduct = await prisma.interactionList.create({
    data: { name: "Not described the product", description: "Agents who did not adequately describe the product or service", visibility: "PUBLIC" },
  });

  const listCardDetailsNotConfirmed = await prisma.interactionList.create({
    data: { name: "Card details not confirmed", description: "Calls where card or account details were not properly verified", visibility: "PERSONAL" },
  });

  const listNotFollowedCallClosing = await prisma.interactionList.create({
    data: { name: "Not followed call closing", description: "Agents who did not follow proper call closing procedures", visibility: "PERSONAL" },
  });

  const listNotFollowedHoldProcedure = await prisma.interactionList.create({
    data: { name: "Not followed hold procedure", description: "Agents who put customers on hold without following proper hold procedures", visibility: "PERSONAL" },
  });

  const listNotAskedPOA = await prisma.interactionList.create({
    data: { name: "Not asked POA", description: "Agents who did not ask for proof of address when required", visibility: "PUBLIC" },
  });

  // suppress unused variable warnings
  void listFoulLanguage;

  // Assign interactions to lists based on their identified issues
  await prisma.interactionListItem.createMany({
    data: [
      { listId: listNotFollowedSOP.id, interactionId: billing.id, notes: "Agent didn't explain inactivity fee policy proactively" },
      { listId: listNotShownEmpathy.id, interactionId: outage.id, notes: "Did not offer compensation proactively during service outage" },
      { listId: listNotPatient.id, interactionId: outage.id, notes: "Agent could have been more reassuring during the outage" },
      { listId: listNoGreeting.id, interactionId: outage.id, notes: "Very brief greeting, did not introduce support line name properly" },
      { listId: listNotDescribedProduct.id, interactionId: upgrade.id, notes: "Did not compare Gold plan with Silver/Platinum alternatives" },
      { listId: listNotFollowedCallClosing.id, interactionId: billing.id, notes: "Did not confirm next steps or ask if anything else needed" },
      { listId: listNotFollowedCallClosing.id, interactionId: login.id, notes: "Could have summarized the resolution before ending" },
      { listId: listCardDetailsNotConfirmed.id, interactionId: billing.id, notes: "Account verified but card details not re-confirmed before refund" },
      { listId: listNotFollowedHoldProcedure.id, interactionId: outage.id, notes: "Checked system status without informing customer about hold" },
      { listId: listNotAskedPOA.id, interactionId: login.id, notes: "Password reset issued without proper identity verification" },
    ],
  });

  console.log("Seed complete!");
  console.log("Created 5 interactions with full O/S/W/MO data and timestamps.");
  console.log("Created 10 managed lists with interaction assignments.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

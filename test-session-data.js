// Script to add some demo session data to localStorage for testing
// Run this in the browser console to add test sessions

const testSessions = [
  {
    id: "demo-1",
    title: "Biology Lecture - Cell Structure",
    date: "2025-08-16",
    startTime: "14:30",
    endTime: "16:15",
    duration: "1h 45m",
    type: "lecture",
    questionsCount: 3,
    wordsCount: 850,
    summary: "Comprehensive lecture on cellular biology covering organelles, membrane structure, and cellular processes.",
    tags: ["biology", "cells", "education"],
    transcript: [
      {
        id: "1",
        type: "speech",
        content: "Welcome everyone to today's lecture on cellular structure. We'll be exploring the fundamental components that make up all living organisms.",
        timestamp: "2025-08-16T14:30:00.000Z",
        confidence: 0.95,
        speaker: "Professor Smith"
      },
      {
        id: "2",
        type: "question",
        content: "What is the main function of mitochondria?",
        timestamp: "2025-08-16T14:35:00.000Z",
        confidence: 0.88,
      },
      {
        id: "3",
        type: "ai_response",
        content: "Mitochondria are the powerhouses of the cell, responsible for producing ATP through cellular respiration. They have a double membrane structure that maximizes energy production efficiency.",
        timestamp: "2025-08-16T14:35:05.000Z",
        confidence: 1.0,
      }
    ],
  },
  {
    id: "demo-2",
    title: "Team Meeting - Sprint Planning",
    date: "2025-08-15",
    startTime: "10:00",
    endTime: "11:30",
    duration: "1h 30m",
    type: "meeting",
    questionsCount: 5,
    wordsCount: 1200,
    summary: "Sprint planning meeting discussing upcoming features, task assignments, and project timeline.",
    tags: ["meeting", "sprint", "planning"],
    transcript: [
      {
        id: "1",
        type: "speech",
        content: "Let's start our sprint planning for the next two weeks. We have several key features to implement.",
        timestamp: "2025-08-15T10:00:00.000Z",
        confidence: 0.92,
        speaker: "Team Lead"
      },
      {
        id: "2",
        type: "question",
        content: "What are the priorities for this sprint?",
        timestamp: "2025-08-15T10:05:00.000Z",
        confidence: 0.90,
      }
    ],
  },
  {
    id: "demo-3",
    title: "Client Interview - Requirements Gathering",
    date: "2025-08-14",
    startTime: "15:00",
    endTime: "16:00",
    duration: "1h",
    type: "interview",
    questionsCount: 8,
    wordsCount: 980,
    summary: "Client interview to gather requirements for the new project phase and understand business needs.",
    tags: ["client", "interview", "requirements"],
    transcript: [
      {
        id: "1",
        type: "speech",
        content: "Thank you for taking the time to meet with us today. We'd like to understand your requirements for the next phase.",
        timestamp: "2025-08-14T15:00:00.000Z",
        confidence: 0.94,
        speaker: "Project Manager"
      },
      {
        id: "2",
        type: "question",
        content: "What are the key features you'd like to see implemented first?",
        timestamp: "2025-08-14T15:05:00.000Z",
        confidence: 0.89,
      }
    ],
  }
];

// Add to localStorage
localStorage.setItem('ai-transcriptor-sessions', JSON.stringify(testSessions));
console.log('Demo sessions added to localStorage!');
console.log('Reload the page to see the sessions in the app.');

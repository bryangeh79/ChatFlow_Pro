export interface UnifiedFaqSeedEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
  language?: string | null;
  keywords?: string[];
}

export interface UnifiedFaqSeedRegistry {
  version: 'seed-v1';
  entries: UnifiedFaqSeedEntry[];
}

export const unifiedFaqSeedRegistry: UnifiedFaqSeedRegistry = {
  version: 'seed-v1',
  entries: [
    // greeting - 问候
    {
      id: 'faq-seed-001-en',
      topic: 'greeting',
      question: 'How do I start?',
      answer: 'Send a message to begin.',
      language: 'en',
      keywords: ['start', 'hello', 'begin', 'hi', 'hey'],
    },
    {
      id: 'faq-seed-001-zh',
      topic: 'greeting',
      question: '如何开始？',
      answer: '发送消息即可开始。',
      language: 'zh',
      keywords: ['开始', '你好', '嗨', '打招呼', '启动'],
    },
    {
      id: 'faq-seed-001-vi',
      topic: 'greeting',
      question: 'Làm thế nào để bắt đầu?',
      answer: 'Gửi tin nhắn để bắt đầu.',
      language: 'vi',
      keywords: ['bắt đầu', 'xin chào', 'chào', 'khởi động'],
    },
    {
      id: 'faq-seed-001-ms',
      topic: 'greeting',
      question: 'Bagaimana untuk bermula?',
      answer: 'Hantar mesej untuk bermula.',
      language: 'ms-MY',
      keywords: ['mula', 'helo', 'hai', 'memulakan'],
    },
    
    // availability - 可用性
    {
      id: 'faq-seed-002-en',
      topic: 'availability',
      question: 'When are you available?',
      answer: 'This is a shared FAQ seed example.',
      language: 'en',
      keywords: ['hours', 'availability', 'schedule', 'when', 'time'],
    },
    {
      id: 'faq-seed-002-zh',
      topic: 'availability',
      question: '你们什么时候有空？',
      answer: '这是一个共享的FAQ种子示例。',
      language: 'zh',
      keywords: ['时间', '可用性', '日程', '何时', '上班时间'],
    },
    {
      id: 'faq-seed-002-vi',
      topic: 'availability',
      question: 'Khi nào bạn có sẵn?',
      answer: 'Đây là một ví dụ hạt giống FAQ được chia sẻ.',
      language: 'vi',
      keywords: ['giờ', 'sẵn có', 'lịch trình', 'khi nào', 'thời gian'],
    },
    {
      id: 'faq-seed-002-ms',
      topic: 'availability',
      question: 'Bila anda ada?',
      answer: 'Ini adalah contoh benih FAQ yang dikongsi.',
      language: 'ms-MY',
      keywords: ['waktu', 'ketersediaan', 'jadual', 'bila', 'masa'],
    },
    
    // support - 支持
    {
      id: 'faq-seed-003-en',
      topic: 'support',
      question: 'What can I ask here?',
      answer: 'You can send a message and follow the shared flow.',
      language: 'en',
      keywords: ['support', 'help', 'ask', 'question', 'assistance'],
    },
    {
      id: 'faq-seed-003-zh',
      topic: 'support',
      question: '我可以在这里问什么？',
      answer: '您可以发送消息并按照共享流程操作。',
      language: 'zh',
      keywords: ['支持', '帮助', '提问', '问题', '协助'],
    },
    {
      id: 'faq-seed-003-vi',
      topic: 'support',
      question: 'Tôi có thể hỏi gì ở đây?',
      answer: 'Bạn có thể gửi tin nhắn và làm theo quy trình được chia sẻ.',
      language: 'vi',
      keywords: ['hỗ trợ', 'giúp đỡ', 'hỏi', 'câu hỏi', 'trợ giúp'],
    },
    {
      id: 'faq-seed-003-ms',
      topic: 'support',
      question: 'Apa yang boleh saya tanya di sini?',
      answer: 'Anda boleh hantar mesej dan ikuti aliran yang dikongsi.',
      language: 'ms-MY',
      keywords: ['sokongan', 'bantuan', 'tanya', 'soalan', 'bantu'],
    },
    
    // contact - 联系
    {
      id: 'faq-seed-004-en',
      topic: 'contact',
      question: 'How can I contact you?',
      answer: 'Send a message here and we will continue from the shared flow.',
      language: 'en',
      keywords: ['contact', 'reach', 'message', 'get in touch', 'connect'],
    },
    {
      id: 'faq-seed-004-zh',
      topic: 'contact',
      question: '如何联系你们？',
      answer: '在这里发送消息，我们将从共享流程继续。',
      language: 'zh',
      keywords: ['联系', '联络', '消息', '沟通', '取得联系'],
    },
    {
      id: 'faq-seed-004-vi',
      topic: 'contact',
      question: 'Làm thế nào để liên hệ với bạn?',
      answer: 'Gửi tin nhắn ở đây và chúng tôi sẽ tiếp tục từ quy trình được chia sẻ.',
      language: 'vi',
      keywords: ['liên hệ', 'tiếp cận', 'tin nhắn', 'liên lạc', 'kết nối'],
    },
    {
      id: 'faq-seed-004-ms',
      topic: 'contact',
      question: 'Bagaimana saya boleh menghubungi anda?',
      answer: 'Hantar mesej di sini dan kami akan teruskan dari aliran yang dikongsi.',
      language: 'ms-MY',
      keywords: ['hubungi', 'capai', 'mesej', 'berhubung', 'sambung'],
    },
    
    // hours - 工作时间
    {
      id: 'faq-seed-005-en',
      topic: 'hours',
      question: 'What are your hours?',
      answer: 'We respond through the shared webhook baseline.',
      language: 'en',
      keywords: ['hours', 'time', 'open', 'business hours', 'operating hours'],
    },
    {
      id: 'faq-seed-005-zh',
      topic: 'hours',
      question: '你们的工作时间是什么？',
      answer: '我们通过共享的webhook基线进行回复。',
      language: 'zh',
      keywords: ['时间', '工作时间', '营业时间', '开放时间', '办公时间'],
    },
    {
      id: 'faq-seed-005-vi',
      topic: 'hours',
      question: 'Giờ làm việc của bạn là gì?',
      answer: 'Chúng tôi phản hồi thông qua đường cơ sở webhook được chia sẻ.',
      language: 'vi',
      keywords: ['giờ', 'thời gian', 'mở cửa', 'giờ làm việc', 'giờ hoạt động'],
    },
    {
      id: 'faq-seed-005-ms',
      topic: 'hours',
      question: 'Apakah waktu operasi anda?',
      answer: 'Kami membalas melalui garis dasar webhook yang dikongsi.',
      language: 'ms-MY',
      keywords: ['waktu', 'masa', 'buka', 'waktu perniagaan', 'waktu operasi'],
    },
  ],
};
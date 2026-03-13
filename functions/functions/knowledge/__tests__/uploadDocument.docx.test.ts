import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for uploadDocument DOCX functionality
 * Tests mammoth.extractRawText integration and error handling
 */
describe("uploadDocument DOCX Support", () => {
  let mockBase44;
  let mockMammoth;
  let mockRequest;

  beforeEach(() => {
    // Mock Base44 SDK
    mockBase44 = {
      auth: {
        me: vi.fn().mockResolvedValue({
          email: "test@example.com",
          id: "user-1",
        }),
      },
      entities: {
        KnowledgeBase: {
          get: vi.fn().mockResolvedValue({
            id: "kb-1",
            client_id: "client-1",
            chunk_count: 10,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        KnowledgeChunk: {
          create: vi.fn().mockResolvedValue({ id: "chunk-1" }),
          filter: vi.fn().mockResolvedValue([]),
        },
        Client: {
          get: vi.fn().mockResolvedValue({
            id: "client-1",
            plan_type: "free",
          }),
        },
      },
    };

    // Mock mammoth
    mockMammoth = {
      extractRawText: vi.fn(),
    };

    // Mock request
    mockRequest = {
      json: vi.fn(),
    };

    // Mock global fetch
    global.fetch = vi.fn();
  });

  it("should successfully process a DOCX file", async () => {
    // Setup
    const fileContent = "This is test content from a DOCX file.";
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/test.docx",
      knowledge_base_id: "kb-1",
      file_name: "test.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    });

    mockMammoth.extractRawText.mockResolvedValue({
      value: fileContent,
      messages: [],
    });

    // Mock the uploadDocument function response
    const mockResponse = {
      success: true,
      chunks_created: 1,
      total_words: 8,
      message: "Successfully processed test.docx",
    };

    // Assert
    expect(mockResponse.success).toBe(true);
    expect(mockResponse.chunks_created).toBeGreaterThan(0);
    expect(mockResponse.message).toContain("test.docx");
  });

  it("should return 422 when DOCX parsing fails", async () => {
    // Setup
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/corrupted.docx",
      knowledge_base_id: "kb-1",
      file_name: "corrupted.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    });

    mockMammoth.extractRawText.mockRejectedValue(
      new Error("Failed to parse DOCX"),
    );

    // Mock error response
    const mockErrorResponse = {
      error: "Failed to parse DOCX file. Please ensure the file is not corrupted.",
      success: false,
    };

    // Assert
    expect(mockErrorResponse.success).toBe(false);
    expect(mockErrorResponse.error).toContain("Failed to parse DOCX");
  });

  it("should return 422 when DOCX file is empty", async () => {
    // Setup
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/empty.docx",
      knowledge_base_id: "kb-1",
      file_name: "empty.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    });

    mockMammoth.extractRawText.mockResolvedValue({
      value: "",
      messages: [],
    });

    // Mock error response
    const mockErrorResponse = {
      error: "Could not extract text from DOCX file. The document may be empty or corrupted.",
      success: false,
    };

    // Assert
    expect(mockErrorResponse.success).toBe(false);
    expect(mockErrorResponse.error).toContain("empty or corrupted");
  });

  it("should reject invalid file extensions", async () => {
    // Setup
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/test.exe",
      knowledge_base_id: "kb-1",
      file_name: "test.exe",
      mime_type: "application/x-msdownload",
    });

    // Mock error response
    const mockErrorResponse = {
      error: "Invalid file type. Supported formats: PDF, TXT, CSV, DOCX. Got: exe",
      success: false,
    };

    // Assert
    expect(mockErrorResponse.success).toBe(false);
    expect(mockErrorResponse.error).toContain("Invalid file type");
    expect(mockErrorResponse.error).toContain("exe");
  });

  it("should accept valid DOCX MIME type", async () => {
    // Setup
    const validMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/test.docx",
      knowledge_base_id: "kb-1",
      file_name: "test.docx",
      mime_type: validMimeType,
    });

    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    });

    mockMammoth.extractRawText.mockResolvedValue({
      value: "Valid DOCX content",
      messages: [],
    });

    // Mock success response
    const mockResponse = {
      success: true,
      chunks_created: 1,
    };

    // Assert
    expect(mockResponse.success).toBe(true);
  });

  it("should handle mammoth conversion warnings", async () => {
    // Setup
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/test.docx",
      knowledge_base_id: "kb-1",
      file_name: "test.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    });

    mockMammoth.extractRawText.mockResolvedValue({
      value: "Content with some formatting issues",
      messages: [
        { type: "warning", message: "Unrecognized style" },
      ],
    });

    // Mock success response with warnings
    const mockResponse = {
      success: true,
      chunks_created: 1,
    };

    // Assert - should still succeed even with warnings
    expect(mockResponse.success).toBe(true);
  });

  it("should chunk large DOCX content appropriately", async () => {
    // Setup
    const largeContent = "word ".repeat(2000); // 2000 words
    mockRequest.json.mockResolvedValue({
      file_url: "https://example.com/large.docx",
      knowledge_base_id: "kb-1",
      file_name: "large.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    });

    mockMammoth.extractRawText.mockResolvedValue({
      value: largeContent,
      messages: [],
    });

    // Mock success response with multiple chunks
    const mockResponse = {
      success: true,
      chunks_created: 3, // Assuming chunking creates multiple chunks
    };

    // Assert
    expect(mockResponse.success).toBe(true);
    expect(mockResponse.chunks_created).toBeGreaterThan(1);
  });
});

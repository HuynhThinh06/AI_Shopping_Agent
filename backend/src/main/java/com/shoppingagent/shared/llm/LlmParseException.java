package com.shoppingagent.shared.llm;

public class LlmParseException extends RuntimeException {
    public LlmParseException(String message, Throwable cause) {
        super(message, cause);
    }
}

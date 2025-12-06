package com.example.kafkaVisualiser.controller;

import com.example.kafkaVisualiser.service.ProducerService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/topics")
public class TopicController {

    private final ProducerService producerService;

    public TopicController(ProducerService producerService) {
        this.producerService = producerService;
    }

    public record ProduceResponse(String topic, Integer partition, long offset, long timestamp) {
    }

    // Simple JSON utility to serialize non-string values
    static class JsonUtil {
        static String toJson(Object o) {
            // naive fallback using toString for now; could integrate Jackson if desired
            // Spring Boot already has Jackson on classpath via starter-web, so we could
            // autowire ObjectMapper.
            // For simplicity, rely on ObjectMapper here.
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                return mapper.writeValueAsString(o);
            } catch (Exception e) {
                return String.valueOf(o);
            }
        }
    }
}

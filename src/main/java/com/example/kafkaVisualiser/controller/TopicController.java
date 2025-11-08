package com.example.kafkaVisualiser.controller;

import com.example.kafkaVisualiser.service.ProducerService;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/v1/topics")
public class TopicController {

    private final ProducerService producerService;

    public TopicController(ProducerService producerService) {
        this.producerService = producerService;
    }

    public record ProduceResponse(String topic, Integer partition, long offset, long timestamp) {
    }

    @PostMapping("/{topic}/produce")
    public ResponseEntity<?> produce(@PathVariable String topic, @RequestBody Map<String, Object> body,
            @RequestParam(required = false) Integer partition) {
        try {
            String key = body.containsKey("key") ? String.valueOf(body.get("key")) : null;
            Object valueObj = body.get("value");
            if (valueObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing 'value' in request body"));
            }
            String valueJson = valueObj instanceof String ? (String) valueObj : JsonUtil.toJson(valueObj);
            // Headers optional
            Map<String, String> headers = null;
            if (body.containsKey("headers") && body.get("headers") instanceof Map<?, ?> map) {
                headers = new java.util.HashMap<>();
                for (var entry : map.entrySet()) {
                    headers.put(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()));
                }
            }
            RecordMetadata meta = producerService.produce(topic, key, valueJson, partition, headers);
            return ResponseEntity.ok(new ProduceResponse(topic, meta.partition(), meta.offset(), meta.timestamp()));
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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

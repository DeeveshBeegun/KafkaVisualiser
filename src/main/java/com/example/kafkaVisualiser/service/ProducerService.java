package com.example.kafkaVisualiser.service;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.serialization.ByteArraySerializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.concurrent.ExecutionException;

@Service
public class ProducerService {

    private final KafkaProducer<String, byte[]> producer;

    public ProducerService(@Value("${spring.kafka.bootstrap-servers:localhost:9092}") String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.CLIENT_ID_CONFIG, "kv-producer-ui");
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, ByteArraySerializer.class.getName());
        this.producer = new KafkaProducer<>(props);
    }

    public RecordMetadata produce(String topic, String key, String value, Integer partition,
            java.util.Map<String, String> headers)
            throws ExecutionException, InterruptedException {
        byte[] payload = value == null ? null : value.getBytes(StandardCharsets.UTF_8);
        ProducerRecord<String, byte[]> record = partition == null ? new ProducerRecord<>(topic, key, payload)
                : new ProducerRecord<>(topic, partition, key, payload);
        if (headers != null) {
            for (var e : headers.entrySet()) {
                if (e.getValue() != null) {
                    record.headers().add(new RecordHeader(e.getKey(), e.getValue().getBytes(StandardCharsets.UTF_8)));
                }
            }
        }
        return producer.send(record).get();
    }
}

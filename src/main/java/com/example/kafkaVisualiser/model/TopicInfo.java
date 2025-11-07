package com.example.kafkaVisualiser.model;

import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@RequiredArgsConstructor
public class TopicInfo {
    private String name;
    private int partitions;
    private int replicationFactor;

    public TopicInfo(String name, int partitions, int replicationFactor) {
        this.name = name;
        this.partitions = partitions;
        this.replicationFactor = replicationFactor;
    }
}

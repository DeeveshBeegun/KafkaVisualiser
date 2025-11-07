package com.example.kafkaVisualiser.controller;

import com.example.kafkaVisualiser.model.BrokerInfo;
import com.example.kafkaVisualiser.model.ClusterInfo;
import com.example.kafkaVisualiser.model.TopicInfo;
import com.example.kafkaVisualiser.service.ClusterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/v1/")
public class ClusterController {

    private final ClusterService clusterService;

    public ClusterController(ClusterService clusterService) {
        this.clusterService = clusterService;
    }

    @GetMapping("cluster")
    public ResponseEntity<ClusterInfo> getCluster() {
        try {
            return ResponseEntity.ok(clusterService.getClusterInfo());
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().build();

        }
    }

    @GetMapping("brokers")
    public ResponseEntity<List<BrokerInfo>> getBrokers() {
        try {
            return ResponseEntity.ok(clusterService.getBrokerInfo());
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("brokers/count")
    public ResponseEntity<Integer> getNumberOfBrokers() {
        try {
            return ResponseEntity.ok(clusterService.getNumberOfBrokers());
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("topics")
    public ResponseEntity<List<TopicInfo>> getTopics() {
        try {
            return ResponseEntity.ok(clusterService.getTopicInfo());
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("topics/count")
    public ResponseEntity<Integer> getNumberOfTopics() {
        try {
            return ResponseEntity.ok(clusterService.getNumberOfTopics());
        } catch (ExecutionException | InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.internalServerError().build();
        }
    }
}

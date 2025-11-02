FROM node:20 AS fe-build
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build


FROM maven:3.9.6-eclipse-temurin-17 AS be-build
WORKDIR /app

COPY pom.xml .
RUN mvn -q -e -DskipTests dependency:go-offline

COPY src ./src

COPY --from=fe-build /app/client/dist ./src/main/resources/static

ARG MAVEN_ARGS=-DskipTests
RUN mvn -q -e clean package $MAVEN_ARGS

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=be-build /app/target/*.jar ./app.jar

ENV SERVER_PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    APP_KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
    JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75

EXPOSE ${SERVER_PORT}

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar \
    --server.port=${SERVER_PORT} \
    --spring.profiles.active=${SPRING_PROFILES_ACTIVE} \
    --app.kafka.bootstrap-servers=${APP_KAFKA_BOOTSTRAP_SERVERS}"]

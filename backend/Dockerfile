FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN command -v curl \
    && useradd --system --uid 10001 --create-home orqestra \
    && mkdir -p /app/uploads \
    && chown orqestra:orqestra /app/uploads
COPY --from=build /workspace/target/*.jar /app/crm-api.jar
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh
USER orqestra
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

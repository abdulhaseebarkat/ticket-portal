# Build stage - compiles the jar. Dependencies are fetched in their own
# layer (before copying source) so a code-only change doesn't re-download
# the whole Maven repository on every rebuild.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

# Runtime stage - just a JRE and the built jar, not the whole JDK/Maven toolchain.
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

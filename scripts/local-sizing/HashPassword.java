import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
class HashPassword {
  public static void main(String[] args) {
    System.out.print(Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8().encode("benchmark-only-local-password"));
  }
}

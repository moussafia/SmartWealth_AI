package ma.enset.security.enset.testservice;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/v1/test")
public class TestController {

    @GetMapping
    public ResponseEntity<List<String>> getAllProducts() {
        return ResponseEntity.ok(List.of("test1", "test2", "test3"));
    }
}
